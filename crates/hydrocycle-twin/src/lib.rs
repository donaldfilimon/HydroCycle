mod mesh;
pub mod scene;
use glam::{Mat4, Vec3};
use scene::{Instance, MAX_INSTANCES, Manifest, Options};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use wgpu::util::DeviceExt;

struct GpuMesh {
    vertices: wgpu::Buffer,
    indices: wgpu::Buffer,
    count: u32,
}
pub struct Engine {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    view_format: wgpu::TextureFormat,
    pipeline: wgpu::RenderPipeline,
    camera: wgpu::Buffer,
    bind: wgpu::BindGroup,
    depth: wgpu::TextureView,
    meshes: Vec<GpuMesh>,
    instances: Vec<wgpu::Buffer>,
    pub manifest: Manifest,
    pub options: Options,
}
impl Engine {
    pub async fn create(
        surface: wgpu::Surface<'static>,
        instance: wgpu::Instance,
        width: u32,
        height: u32,
        manifest: Manifest,
    ) -> Result<Self, String> {
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .map_err(|e| format!("WebGPU adapter unavailable: {e}"))?;
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("HydroCycle custom raster renderer"),
                required_features: wgpu::Features::empty(),
                required_limits: wgpu::Limits::downlevel_defaults(),
                memory_hints: wgpu::MemoryHints::MemoryUsage,
                trace: wgpu::Trace::Off,
            })
            .await
            .map_err(|e| format!("GPU device initialization failed: {e}"))?;
        let mut config = surface
            .get_default_config(&adapter, width.max(1), height.max(1))
            .ok_or("Unsupported GPU surface")?;
        // Canvas surfaces commonly expose linear UNORM formats. Render through an
        // sRGB view so linear lighting receives exactly one display encoding on
        // both browser and native surfaces.
        let view_format = config.format.add_srgb_suffix();
        if view_format != config.format {
            config.view_formats.push(view_format);
        }
        config.present_mode = wgpu::PresentMode::Fifo;
        surface.configure(&device, &config);
        let camera = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("camera"),
            contents: bytemuck::cast_slice(&Mat4::IDENTITY.to_cols_array()),
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        });
        let layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: None,
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: false,
                    min_binding_size: None,
                },
                count: None,
            }],
        });
        let bind = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: camera.as_entire_binding(),
            }],
        });
        let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[&layout],
            push_constant_ranges: &[],
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("directional light WGSL"),
            source: wgpu::ShaderSource::Wgsl(include_str!("shader.wgsl").into()),
        });
        let pipeline=device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {label:Some("instanced opaque meshes"),layout:Some(&pipeline_layout),vertex:wgpu::VertexState {module:&shader,entry_point:Some("vs_main"),compilation_options:Default::default(),buffers:&[
   wgpu::VertexBufferLayout {array_stride:24,step_mode:wgpu::VertexStepMode::Vertex,attributes:&wgpu::vertex_attr_array![0=>Float32x3,1=>Float32x3]},
   wgpu::VertexBufferLayout {array_stride:80,step_mode:wgpu::VertexStepMode::Instance,attributes:&wgpu::vertex_attr_array![2=>Float32x4,3=>Float32x4,4=>Float32x4,5=>Float32x4,6=>Float32x4]},
  ]},fragment:Some(wgpu::FragmentState {module:&shader,entry_point:Some("fs_main"),compilation_options:Default::default(),targets:&[Some(wgpu::ColorTargetState {format:view_format,blend:None,write_mask:wgpu::ColorWrites::ALL})]}),primitive:wgpu::PrimitiveState {cull_mode:None,..Default::default()},depth_stencil:Some(wgpu::DepthStencilState {format:wgpu::TextureFormat::Depth24Plus,depth_write_enabled:true,depth_compare:wgpu::CompareFunction::Less,stencil:Default::default(),bias:Default::default()}),multisample:Default::default(),multiview:None,cache:None});
        let meshes = [
            mesh::Mesh::cube(),
            mesh::Mesh::cylinder(false),
            mesh::Mesh::sphere(),
            mesh::Mesh::cylinder(true),
        ]
        .into_iter()
        .map(|m| GpuMesh {
            vertices: device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: None,
                contents: bytemuck::cast_slice(&m.vertices),
                usage: wgpu::BufferUsages::VERTEX,
            }),
            indices: device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
                label: None,
                contents: bytemuck::cast_slice(&m.indices),
                usage: wgpu::BufferUsages::INDEX,
            }),
            count: m.indices.len() as u32,
        })
        .collect();
        let instances = (0..4)
            .map(|_| {
                device.create_buffer(&wgpu::BufferDescriptor {
                    label: Some("bounded instance batch"),
                    size: (MAX_INSTANCES * std::mem::size_of::<Instance>()) as u64,
                    usage: wgpu::BufferUsages::VERTEX | wgpu::BufferUsages::COPY_DST,
                    mapped_at_creation: false,
                })
            })
            .collect();
        let depth = Self::depth(&device, &config);
        let options = manifest.options("{}")?;
        Ok(Self {
            surface,
            device,
            queue,
            config,
            view_format,
            pipeline,
            camera,
            bind,
            depth,
            meshes,
            instances,
            manifest,
            options,
        })
    }
    fn depth(d: &wgpu::Device, c: &wgpu::SurfaceConfiguration) -> wgpu::TextureView {
        d.create_texture(&wgpu::TextureDescriptor {
            label: Some("depth"),
            size: wgpu::Extent3d {
                width: c.width,
                height: c.height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: 1,
            dimension: wgpu::TextureDimension::D2,
            format: wgpu::TextureFormat::Depth24Plus,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        })
        .create_view(&Default::default())
    }
    pub fn resize(&mut self, width: u32, height: u32) {
        let max = self.device.limits().max_texture_dimension_2d;
        self.config.width = width.clamp(1, max);
        self.config.height = height.clamp(1, max);
        self.surface.configure(&self.device, &self.config);
        self.depth = Self::depth(&self.device, &self.config);
    }
    pub fn configure(&mut self, json: &str) -> Result<(), String> {
        self.options = self.manifest.options(json)?;
        Ok(())
    }
    pub fn render(&mut self) -> Result<(), String> {
        let o = &self.options;
        let target = self.manifest.camera_target(o);
        let eye = target
            + Vec3::new(
                o.yaw.sin() * o.pitch.cos(),
                o.pitch.sin(),
                o.yaw.cos() * o.pitch.cos(),
            ) * o.distance;
        let matrix = Mat4::perspective_rh(
            45_f32.to_radians(),
            self.config.width as f32 / self.config.height as f32,
            0.05,
            150.,
        ) * Mat4::look_at_rh(eye, target, Vec3::Y);
        self.queue.write_buffer(
            &self.camera,
            0,
            bytemuck::cast_slice(&matrix.to_cols_array()),
        );
        let batches = self.manifest.batches(o);
        if batches.iter().map(Vec::len).sum::<usize>() > MAX_INSTANCES {
            return Err("Scene instance budget exceeded".into());
        }
        for (buffer, batch) in self.instances.iter().zip(&batches) {
            if !batch.is_empty() {
                self.queue
                    .write_buffer(buffer, 0, bytemuck::cast_slice(batch));
            }
        }
        let output = match self.surface.get_current_texture() {
            Ok(x) => x,
            Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                self.surface.configure(&self.device, &self.config);
                return Ok(());
            }
            Err(wgpu::SurfaceError::Timeout) => return Ok(()),
            Err(e) => return Err(format!("GPU surface error: {e}")),
        };
        let view = output.texture.create_view(&wgpu::TextureViewDescriptor {
            format: Some(self.view_format),
            ..Default::default()
        });
        let mut encoder = self.device.create_command_encoder(&Default::default());
        {
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("HydroCycle geometry"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    depth_slice: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.008,
                            g: 0.019,
                            b: 0.031,
                            a: 1.,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: Some(wgpu::RenderPassDepthStencilAttachment {
                    view: &self.depth,
                    depth_ops: Some(wgpu::Operations {
                        load: wgpu::LoadOp::Clear(1.),
                        store: wgpu::StoreOp::Store,
                    }),
                    stencil_ops: None,
                }),
                timestamp_writes: None,
                occlusion_query_set: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &self.bind, &[]);
            for (i, batch) in batches.iter().enumerate() {
                if batch.is_empty() {
                    continue;
                }
                let m = &self.meshes[i];
                pass.set_vertex_buffer(0, m.vertices.slice(..));
                pass.set_vertex_buffer(1, self.instances[i].slice(..));
                pass.set_index_buffer(m.indices.slice(..), wgpu::IndexFormat::Uint32);
                pass.draw_indexed(0..m.count, 0, 0..batch.len() as u32);
            }
        }
        self.queue.submit(Some(encoder.finish()));
        output.present();
        Ok(())
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct TwinRenderer {
    engine: Engine,
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl TwinRenderer {
    pub async fn create(
        canvas: web_sys::HtmlCanvasElement,
        manifest_json: String,
    ) -> Result<TwinRenderer, JsValue> {
        console_error_panic_hook::set_once();
        let manifest = Manifest::parse(&manifest_json).map_err(|e| JsValue::from_str(&e))?;
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..Default::default()
        });
        let width = canvas.width();
        let height = canvas.height();
        let surface = instance
            .create_surface(wgpu::SurfaceTarget::Canvas(canvas))
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        let engine = Engine::create(surface, instance, width, height, manifest)
            .await
            .map_err(|e| JsValue::from_str(&e))?;
        Ok(Self { engine })
    }
    pub fn resize(&mut self, width: u32, height: u32) {
        self.engine.resize(width, height)
    }
    pub fn configure(&mut self, json: String) -> Result<(), JsValue> {
        self.engine
            .configure(&json)
            .map_err(|e| JsValue::from_str(&e))
    }
    pub fn render(&mut self) -> Result<(), JsValue> {
        self.engine.render().map_err(|e| JsValue::from_str(&e))
    }
    pub fn instance_count(&self) -> u32 {
        self.engine
            .manifest
            .batches(&self.engine.options)
            .iter()
            .map(Vec::len)
            .sum::<usize>() as u32
    }
}
