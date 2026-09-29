use bytemuck::{Pod, Zeroable};
use glam::{Mat4, Quat, Vec3};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct Manifest {
    pub geometry: Geometry,
    pub frames: Vec<Frame>,
    pub stages: Vec<Stage>,
    pub variants: Vec<Variant>,
}
#[derive(Deserialize)]
pub struct Geometry {
    pub bore_mm: f32,
}
#[derive(Deserialize)]
pub struct Frame {
    pub crank_pin_mm: [f32; 3],
    pub piston_pin_mm: [f32; 3],
}
#[derive(Deserialize)]
pub struct Stage {
    pub id: String,
    pub position: [f32; 3],
    pub envelope: [f32; 3],
}
#[derive(Deserialize)]
pub struct Variant {
    pub id: String,
    pub stage_ids: Vec<String>,
    pub connections: Vec<[String; 2]>,
}
#[derive(Deserialize, Clone)]
#[serde(default)]
pub struct Options {
    pub frame_index: usize,
    pub variant: String,
    pub visible_stages: Option<Vec<String>>,
    pub focus_stage: Option<String>,
    pub section: bool,
    pub explode: f32,
    pub yaw: f32,
    pub pitch: f32,
    pub distance: f32,
    pub pan_x: f32,
    pub pan_y: f32,
}
impl Default for Options {
    fn default() -> Self {
        Self {
            frame_index: 0,
            variant: String::new(),
            visible_stages: None,
            focus_stage: None,
            section: true,
            explode: 0.,
            yaw: 0.55,
            pitch: 0.45,
            distance: 24.,
            pan_x: 0.,
            pan_y: 0.,
        }
    }
}
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Instance {
    pub model: [[f32; 4]; 4],
    pub color: [f32; 4],
}
pub type Batch = Vec<Instance>;
pub const MAX_INSTANCES: usize = 1000;
const STEEL: [f32; 4] = [0.48, 0.58, 0.65, 1.];
const DARK: [f32; 4] = [0.065, 0.12, 0.16, 1.];
const CYAN: [f32; 4] = [0.09, 0.75, 0.83, 1.];
const GOLD: [f32; 4] = [0.98, 0.58, 0.16, 1.];
fn add(batch: &mut Batch, p: Vec3, size: Vec3, q: Quat, color: [f32; 4]) {
    batch.push(Instance {
        model: Mat4::from_scale_rotation_translation(size, q, p).to_cols_array_2d(),
        color,
    });
}
fn link(batch: &mut Batch, a: Vec3, b: Vec3, r: f32, color: [f32; 4]) {
    let delta = b - a;
    if delta.length_squared() < 1e-8 {
        return;
    }
    add(
        batch,
        (a + b) * 0.5,
        Vec3::new(r, delta.length(), r),
        Quat::from_rotation_arc(Vec3::Y, delta.normalize()),
        color,
    );
}
impl Manifest {
    pub fn parse(json: &str) -> Result<Self, String> {
        let m: Self =
            serde_json::from_str(json).map_err(|e| format!("Invalid twin manifest: {e}"))?;
        if m.frames.is_empty() || m.stages.is_empty() || m.variants.is_empty() {
            return Err("Manifest requires frames, stages, variants".into());
        }
        if m.stages.len() > 32 || m.frames.len() > 2000 || m.variants.len() > 32 {
            return Err("Manifest exceeds renderer limits".into());
        }
        if !m.geometry.bore_mm.is_finite() || m.geometry.bore_mm <= 0. {
            return Err("Invalid bore".into());
        }
        for s in &m.stages {
            if s.position.iter().any(|x| !x.is_finite())
                || s.envelope.iter().any(|x| !x.is_finite() || *x <= 0.)
            {
                return Err("Invalid stage envelope".into());
            }
        }
        for f in &m.frames {
            if f.crank_pin_mm
                .iter()
                .chain(f.piston_pin_mm.iter())
                .any(|x| !x.is_finite())
            {
                return Err("Nonfinite kinematic frame".into());
            }
        }
        Ok(m)
    }
    pub fn options(&self, json: &str) -> Result<Options, String> {
        let mut o: Options = serde_json::from_str(json).map_err(|e| e.to_string())?;
        if o.frame_index >= self.frames.len() {
            return Err("Frame index out of bounds".into());
        }
        if o.variant.is_empty() {
            o.variant = self.variants[0].id.clone()
        }
        if !self.variants.iter().any(|v| v.id == o.variant) {
            return Err("Unknown variant".into());
        }
        for n in [o.explode, o.yaw, o.pitch, o.distance, o.pan_x, o.pan_y] {
            if !n.is_finite() {
                return Err("Nonfinite camera parameter".into());
            }
        }
        if let Some(id) = &o.focus_stage
            && !self.stages.iter().any(|s| &s.id == id)
        {
            return Err("Unknown focus stage".into());
        }
        o.explode = o.explode.clamp(0., 1.);
        o.pitch = o.pitch.clamp(-1.2, 1.4);
        o.distance = o.distance.clamp(1., 50.);
        o.pan_x = o.pan_x.clamp(-30., 30.);
        o.pan_y = o.pan_y.clamp(-30., 30.);
        Ok(o)
    }
    pub fn camera_target(&self, o: &Options) -> Vec3 {
        let base = o
            .focus_stage
            .as_ref()
            .and_then(|id| self.stages.iter().find(|stage| &stage.id == id))
            .map(|stage| {
                Vec3::from(stage.position)
                    + Vec3::new(
                        stage.position[0] * o.explode * 0.35,
                        0.,
                        stage.position[2] * o.explode * 0.35,
                    )
            })
            .unwrap_or(Vec3::new(0., 0., 3.4));
        base + Vec3::new(o.pan_x, o.pan_y, 0.)
    }
    pub fn batches(&self, o: &Options) -> [Batch; 4] {
        let mut b: [Batch; 4] = std::array::from_fn(|_| vec![]);
        let variant = self
            .variants
            .iter()
            .find(|v| v.id == o.variant)
            .unwrap_or(&self.variants[0]);
        let visible = |s: &Stage| {
            variant.stage_ids.contains(&s.id)
                && o.visible_stages
                    .as_ref()
                    .is_none_or(|ids| ids.contains(&s.id))
        };
        let position = |s: &Stage| {
            Vec3::from(s.position)
                + Vec3::new(
                    s.position[0] * o.explode * 0.35,
                    0.,
                    s.position[2] * o.explode * 0.35,
                )
        };
        add(
            &mut b[0],
            Vec3::new(0., -1.2, 3.4),
            Vec3::new(18., 0.12, 11.),
            Quat::IDENTITY,
            [0.022, 0.046, 0.065, 1.],
        );
        for i in -18..=18 {
            let x = i as f32 * 0.5;
            add(
                &mut b[0],
                Vec3::new(x, -1.134, 3.4),
                Vec3::new(0.008, 0.005, 11.),
                Quat::IDENTITY,
                [0.06, 0.105, 0.13, 1.],
            );
        }
        for i in -11..=11 {
            let z = i as f32 * 0.5;
            add(
                &mut b[0],
                Vec3::new(0., -1.134, z + 3.4),
                Vec3::new(18., 0.005, 0.008),
                Quat::IDENTITY,
                [0.06, 0.105, 0.13, 1.],
            );
        }
        for s in self.stages.iter().filter(|s| visible(s)) {
            let p = position(s);
            let e = Vec3::from(s.envelope);
            if s.id == "ENG-601" {
                // All engine dimensions/kinematics in the authority manifest are mm.
                let scale = 0.007;
                let base = p - Vec3::Y * 0.7;
                let f = &self.frames[o.frame_index];
                let a = base + Vec3::from(f.crank_pin_mm) * scale;
                let pin = base + Vec3::from(f.piston_pin_mm) * scale;
                let bore = self.geometry.bore_mm * scale;
                add(
                    &mut b[0],
                    base + Vec3::new(0., -0.28, 0.),
                    Vec3::new(1.45, 0.24, 1.1),
                    Quat::IDENTITY,
                    DARK,
                );
                add(
                    &mut b[1],
                    base,
                    Vec3::new(0.77, 0.084, 0.77),
                    Quat::from_rotation_x(std::f32::consts::FRAC_PI_2),
                    STEEL,
                );
                link(
                    &mut b[1],
                    base + Vec3::new(0., 0., 0.1),
                    a + Vec3::new(0., 0., 0.1),
                    0.12,
                    GOLD,
                );
                link(&mut b[1], a, pin, 0.085, STEEL);
                add(
                    &mut b[1],
                    pin,
                    Vec3::new(bore, 0.27, bore),
                    Quat::IDENTITY,
                    [0.85, 0.88, 0.87, 1.],
                );
                for dy in [-0.06, 0.04] {
                    add(
                        &mut b[1],
                        pin + Vec3::Y * dy,
                        Vec3::new(bore * 1.015, 0.025, bore * 1.015),
                        Quat::IDENTITY,
                        DARK,
                    );
                }
                if o.section {
                    // Section exposes the moving assembly without inventing gas fields.
                    for x in [-1., 1.] {
                        add(
                            &mut b[0],
                            base + Vec3::new(x * (bore / 2. + 0.07), 1.1, 0.),
                            Vec3::new(0.09, 0.98, bore),
                            Quat::IDENTITY,
                            STEEL,
                        );
                    }
                } else {
                    add(
                        &mut b[1],
                        base + Vec3::Y * 1.1,
                        Vec3::new(bore + 0.18, 0.98, bore + 0.18),
                        Quat::IDENTITY,
                        STEEL,
                    );
                }
                add(
                    &mut b[1],
                    base + Vec3::Y * (1.6 + o.explode * 0.7),
                    Vec3::new(bore + 0.26, 0.18, bore + 0.26),
                    Quat::IDENTITY,
                    DARK,
                );
                continue;
            }
            let vessel = s.id.starts_with("WTR")
                || s.id.starts_with("NBG")
                || s.id.starts_with("CND")
                || s.id.starts_with("SEP")
                || s.id.starts_with("CON")
                || s.id.starts_with("USC");
            let color = if s.id.starts_with("USC") || s.id.starts_with("MTR") {
                GOLD
            } else if s.id.starts_with("DAT") || s.id.starts_with("BQA") {
                DARK
            } else {
                STEEL
            };
            add(
                &mut b[if vessel && o.section {
                    3
                } else if vessel {
                    1
                } else {
                    0
                }],
                p,
                e,
                Quat::IDENTITY,
                color,
            );
            add(
                &mut b[0],
                Vec3::new(p.x, -1.04, p.z),
                Vec3::new(e.x * 1.18, 0.12, e.z * 1.18),
                Quat::IDENTITY,
                DARK,
            );
            if vessel {
                for sign in [-1., 1.] {
                    add(
                        &mut b[1],
                        p + Vec3::Y * (e.y * 0.45 * sign),
                        Vec3::new(e.x * 1.12, 0.065, e.z * 1.12),
                        Quat::IDENTITY,
                        DARK,
                    );
                }
                if o.section {
                    for j in 0..18 {
                        let a = j as f32 * 2.39996;
                        let r = (0.08 + (j % 5) as f32 * 0.07) * e.x;
                        let y = ((j * 7 % 19) as f32 / 19. - 0.5) * e.y * 0.72;
                        add(
                            &mut b[2],
                            p + Vec3::new(a.cos() * r, y, a.sin() * r),
                            Vec3::splat(if s.id.starts_with("USC") {
                                0.035
                            } else {
                                0.028
                            }),
                            Quat::IDENTITY,
                            CYAN,
                        );
                    }
                }
            } else {
                add(
                    &mut b[0],
                    p + Vec3::new(0., e.y * 0.16, e.z * 0.505),
                    Vec3::new(e.x * 0.68, e.y * 0.4, 0.012),
                    Quat::IDENTITY,
                    CYAN,
                );
            }
        }
        for [a, z] in &variant.connections {
            if let (Some(a), Some(z)) = (
                self.stages.iter().find(|s| s.id == *a && visible(s)),
                self.stages.iter().find(|s| s.id == *z && visible(s)),
            ) {
                let a = position(a);
                let z = position(z);
                let mid = Vec3::new(z.x, a.y, a.z);
                link(&mut b[1], a, mid, 0.065, CYAN);
                link(&mut b[1], mid, z, 0.065, CYAN);
            }
        }
        b
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Manifest {
        Manifest::parse(include_str!(
            "../../../packages/contracts/fixtures/twin-reference.json"
        ))
        .unwrap()
    }
    #[test]
    fn all_variants_all_frames_stay_within_budget_and_finite() {
        let m = fixture();
        for v in &m.variants {
            for section in [true, false] {
                for explode in [0., 1.] {
                    for frame_index in 0..m.frames.len() {
                        let o = Options {
                            variant: v.id.clone(),
                            section,
                            explode,
                            frame_index,
                            ..Default::default()
                        };
                        let b = m.batches(&o);
                        assert!(b.iter().map(Vec::len).sum::<usize>() <= MAX_INSTANCES);
                        for instance in b.iter().flatten() {
                            assert!(instance.model.iter().flatten().all(|x| x.is_finite()));
                        }
                    }
                }
            }
        }
    }
    #[test]
    fn rejects_bad_inputs_and_clamps_camera() {
        let m = fixture();
        assert!(m.options(r#"{"frame_index":10000}"#).is_err());
        assert!(m.options(r#"{"variant":"invented"}"#).is_err());
        let o = m
            .options(r#"{"distance":0,"pitch":100,"explode":9}"#)
            .unwrap();
        assert_eq!(o.distance, 1.);
        assert_eq!(o.pitch, 1.4);
        assert_eq!(o.explode, 1.);
        assert!(
            Manifest::parse(r#"{"geometry":{"bore_mm":86},"frames":[],"stages":[],"variants":[]}"#)
                .is_err()
        );
    }
    #[test]
    fn empty_visibility_draws_only_reference_floor() {
        let m = fixture();
        let o = Options {
            visible_stages: Some(vec![]),
            ..Default::default()
        };
        let b = m.batches(&o);
        assert!(b[1].is_empty() && b[2].is_empty() && b[3].is_empty());
        assert!(!b[0].is_empty());
    }
    #[test]
    fn focus_tracks_stage_explosion_and_pan() {
        let m = fixture();
        let stage = m.stages.iter().find(|s| s.id == "ENG-601").unwrap();
        let o = m
            .options(r#"{"focus_stage":"ENG-601","explode":1,"pan_x":2,"pan_y":1}"#)
            .unwrap();
        let target = m.camera_target(&o);
        assert!((target.x - (stage.position[0] * 1.35 + 2.)).abs() < 1e-5);
        assert!((target.y - (stage.position[1] + 1.)).abs() < 1e-5);
        assert!((target.z - stage.position[2] * 1.35).abs() < 1e-5);
        assert!(m.options(r#"{"focus_stage":"missing"}"#).is_err());
        assert_eq!(m.camera_target(&Options::default()), Vec3::new(0., 0., 3.4));
    }
    #[test]
    fn connectivity_obeys_isolation() {
        let m = fixture();
        let o = Options {
            visible_stages: Some(vec!["DAT-801".into()]),
            ..Default::default()
        };
        let b = m.batches(&o);
        assert!(b[1].is_empty());
    }
}
