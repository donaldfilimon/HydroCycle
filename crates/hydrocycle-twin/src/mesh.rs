use bytemuck::{Pod, Zeroable};
#[repr(C)]
#[derive(Clone, Copy, Pod, Zeroable)]
pub struct Vertex {
    pub position: [f32; 3],
    pub normal: [f32; 3],
}
pub struct Mesh {
    pub vertices: Vec<Vertex>,
    pub indices: Vec<u32>,
}
impl Mesh {
    fn tri(&mut self, a: [f32; 3], b: [f32; 3], c: [f32; 3], normals: [[f32; 3]; 3]) {
        let base = self.vertices.len() as u32;
        for (position, normal) in [a, b, c].into_iter().zip(normals) {
            self.vertices.push(Vertex { position, normal });
        }
        self.indices.extend([base, base + 1, base + 2]);
    }
    pub fn cube() -> Self {
        let mut m = Self {
            vertices: vec![],
            indices: vec![],
        };
        for (n, u, v) in [
            ([1., 0., 0.], [0., 1., 0.], [0., 0., 1.]),
            ([-1., 0., 0.], [0., 0., 1.], [0., 1., 0.]),
            ([0., 1., 0.], [0., 0., 1.], [1., 0., 0.]),
            ([0., -1., 0.], [1., 0., 0.], [0., 0., 1.]),
            ([0., 0., 1.], [1., 0., 0.], [0., 1., 0.]),
            ([0., 0., -1.], [0., 1., 0.], [1., 0., 0.]),
        ] {
            let n = glam::Vec3::from(n);
            let u = glam::Vec3::from(u) * 0.5;
            let v = glam::Vec3::from(v) * 0.5;
            let c = n * 0.5;
            let p = [c - u - v, c + u - v, c + u + v, c - u + v].map(|p| p.to_array());
            m.tri(p[0], p[1], p[2], [n.to_array(); 3]);
            m.tri(p[0], p[2], p[3], [n.to_array(); 3]);
        }
        m
    }
    pub fn cylinder(half: bool) -> Self {
        let mut m = Self {
            vertices: vec![],
            indices: vec![],
        };
        let segments = if half { 16 } else { 32 };
        for i in 0..segments {
            let offset = if half { std::f32::consts::PI } else { 0. };
            let a = i as f32 / 32. * std::f32::consts::TAU + offset;
            let b = (i + 1) as f32 / 32. * std::f32::consts::TAU + offset;
            let n = [a.cos(), 0., a.sin()];
            let q = [b.cos(), 0., b.sin()];
            let p0 = [n[0] * 0.5, -0.5, n[2] * 0.5];
            let p1 = [q[0] * 0.5, -0.5, q[2] * 0.5];
            let p2 = [q[0] * 0.5, 0.5, q[2] * 0.5];
            let p3 = [n[0] * 0.5, 0.5, n[2] * 0.5];
            m.tri(p0, p2, p1, [n, q, q]);
            m.tri(p0, p3, p2, [n, n, q]);
            m.tri([0., 0.5, 0.], p2, p3, [[0., 1., 0.]; 3]);
            m.tri([0., -0.5, 0.], p0, p1, [[0., -1., 0.]; 3]);
        }
        m
    }
    pub fn sphere() -> Self {
        let mut m = Self {
            vertices: vec![],
            indices: vec![],
        };
        for y in 0..8 {
            for x in 0..12 {
                let point = |x: usize, y: usize| {
                    let a = x as f32 / 12. * std::f32::consts::TAU;
                    let b = y as f32 / 8. * std::f32::consts::PI;
                    [b.sin() * a.cos(), b.cos(), b.sin() * a.sin()]
                };
                let n = [
                    point(x, y),
                    point(x + 1, y),
                    point(x + 1, y + 1),
                    point(x, y + 1),
                ];
                let p = n.map(|v| v.map(|c| c * 0.5));
                m.tri(p[0], p[1], p[2], [n[0], n[1], n[2]]);
                m.tri(p[0], p[2], p[3], [n[0], n[2], n[3]]);
            }
        }
        m
    }
}
