#[cfg(target_arch = "wasm32")]
fn main() {}
#[cfg(not(target_arch = "wasm32"))]
fn main() -> Result<(), Box<dyn std::error::Error>> {
    use hydrocycle_twin::{Engine, scene::Manifest};
    use std::{sync::Arc, time::Instant};
    use winit::{
        application::ApplicationHandler,
        event::{ElementState, MouseButton, MouseScrollDelta, WindowEvent},
        event_loop::{ActiveEventLoop, EventLoop},
        keyboard::{KeyCode, PhysicalKey},
        window::{Window, WindowId},
    };
    struct App {
        window: Option<Arc<Window>>,
        engine: Option<Engine>,
        json: String,
        last: Instant,
        playing: bool,
        drag: bool,
        cursor: Option<(f64, f64)>,
        frame: f64,
        rendered: usize,
        smoke: bool,
        failure: Option<String>,
    }
    impl ApplicationHandler for App {
        fn resumed(&mut self, event_loop: &ActiveEventLoop) {
            if self.window.is_some() {
                return;
            }
            let result = (|| -> Result<(), String> {
                let window=Arc::new(event_loop.create_window(Window::default_attributes().with_title("HydroCycle • custom wgpu research twin • Space pause · drag orbit · wheel zoom").with_inner_size(winit::dpi::LogicalSize::new(1280.,800.))).map_err(|e|e.to_string())?);
                let instance = wgpu::Instance::new(&Default::default());
                let surface = instance
                    .create_surface(window.clone())
                    .map_err(|e| e.to_string())?;
                let size = window.inner_size();
                let engine = pollster::block_on(Engine::create(
                    surface,
                    instance,
                    size.width,
                    size.height,
                    Manifest::parse(&self.json)?,
                ))?;
                self.engine = Some(engine);
                self.window = Some(window);
                Ok(())
            })();
            if let Err(e) = result {
                eprintln!("HydroCycle initialization: {e}");
                self.failure = Some(e);
                event_loop.exit()
            }
        }
        fn window_event(&mut self, event_loop: &ActiveEventLoop, _: WindowId, event: WindowEvent) {
            let Some(engine) = self.engine.as_mut() else {
                return;
            };
            match event {
                WindowEvent::CloseRequested => event_loop.exit(),
                WindowEvent::Resized(size) => engine.resize(size.width, size.height),
                WindowEvent::MouseInput {
                    state,
                    button: MouseButton::Left,
                    ..
                } => {
                    self.drag = state == ElementState::Pressed;
                    self.cursor = None
                }
                WindowEvent::CursorMoved { position, .. } => {
                    if self.drag
                        && let Some((x, y)) = self.cursor
                    {
                        engine.options.yaw -= (position.x - x) as f32 * 0.008;
                        engine.options.pitch = (engine.options.pitch
                            + (position.y - y) as f32 * 0.006)
                            .clamp(-1.2, 1.4)
                    }
                    self.cursor = Some((position.x, position.y))
                }
                WindowEvent::MouseWheel { delta, .. } => {
                    let y = match delta {
                        MouseScrollDelta::LineDelta(_, y) => y,
                        MouseScrollDelta::PixelDelta(p) => p.y as f32 * 0.02,
                    };
                    engine.options.distance = (engine.options.distance - y).clamp(1., 50.)
                }
                WindowEvent::KeyboardInput { event, .. }
                    if event.state == ElementState::Pressed =>
                {
                    match event.physical_key {
                        PhysicalKey::Code(KeyCode::Space) => self.playing = !self.playing,
                        PhysicalKey::Code(KeyCode::KeyS) => {
                            engine.options.section = !engine.options.section
                        }
                        PhysicalKey::Code(KeyCode::KeyE) => {
                            engine.options.explode = 1. - engine.options.explode
                        }
                        PhysicalKey::Code(KeyCode::Digit1) => {
                            engine.options.variant = engine.manifest.variants[0].id.clone()
                        }
                        PhysicalKey::Code(KeyCode::Digit2) => {
                            engine.options.variant = engine
                                .manifest
                                .variants
                                .get(1)
                                .unwrap_or(&engine.manifest.variants[0])
                                .id
                                .clone()
                        }
                        PhysicalKey::Code(KeyCode::Digit3) => {
                            engine.options.variant = engine
                                .manifest
                                .variants
                                .get(2)
                                .unwrap_or(&engine.manifest.variants[0])
                                .id
                                .clone()
                        }
                        PhysicalKey::Code(KeyCode::Digit4) => {
                            engine.options.variant = engine
                                .manifest
                                .variants
                                .get(3)
                                .unwrap_or(&engine.manifest.variants[0])
                                .id
                                .clone()
                        }
                        PhysicalKey::Code(KeyCode::Digit5) => {
                            engine.options.variant = engine
                                .manifest
                                .variants
                                .get(4)
                                .unwrap_or(&engine.manifest.variants[0])
                                .id
                                .clone()
                        }
                        _ => {}
                    }
                }
                WindowEvent::RedrawRequested => {
                    let now = Instant::now();
                    if self.playing {
                        self.frame = (self.frame
                            + now.duration_since(self.last).as_secs_f64().min(0.1) * 30.)
                            % 360.;
                        engine.options.frame_index = self.frame as usize;
                    };
                    self.last = now;
                    if let Err(e) = engine.render() {
                        eprintln!("HydroCycle render: {e}");
                        self.failure = Some(e);
                        event_loop.exit();
                    } else {
                        self.rendered += 1;
                        if self.smoke && self.rendered >= 3 {
                            println!(
                                "HydroCycle native GPU smoke: {} render submissions succeeded",
                                self.rendered
                            );
                            event_loop.exit();
                        }
                    }
                }
                _ => {}
            }
        }
        fn about_to_wait(&mut self, _: &ActiveEventLoop) {
            if let Some(w) = &self.window {
                w.request_redraw()
            }
        }
    }
    let manifest = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "packages/contracts/fixtures/twin-reference.json".into());
    let json = std::fs::read_to_string(&manifest).map_err(|e| format!("Read {manifest}: {e}"))?;
    let mut app = App {
        window: None,
        engine: None,
        json,
        last: Instant::now(),
        playing: false,
        drag: false,
        cursor: None,
        frame: 0.,
        rendered: 0,
        smoke: std::env::args().any(|a| a == "--smoke"),
        failure: None,
    };
    EventLoop::new()?.run_app(&mut app)?;
    if let Some(e) = app.failure {
        return Err(e.into());
    }
    if app.smoke && app.rendered < 3 {
        return Err("Native event loop ended before smoke rendering completed".into());
    }
    Ok(())
}
