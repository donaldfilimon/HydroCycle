struct Camera { view_proj: mat4x4<f32> }
@group(0) @binding(0) var<uniform> camera: Camera;
struct VertexIn {
 @location(0) position: vec3<f32>, @location(1) normal: vec3<f32>,
 @location(2) m0: vec4<f32>, @location(3) m1: vec4<f32>,
 @location(4) m2: vec4<f32>, @location(5) m3: vec4<f32>,
 @location(6) color: vec4<f32>,
}
struct VertexOut {
 @builtin(position) position: vec4<f32>, @location(0) normal: vec3<f32>,
 @location(1) color: vec4<f32>, @location(2) world: vec3<f32>,
}
@vertex fn vs_main(v: VertexIn) -> VertexOut {
 let m = mat4x4<f32>(v.m0, v.m1, v.m2, v.m3);
 var o: VertexOut;
 let world = m * vec4<f32>(v.position, 1.0);
 o.position = camera.view_proj * world;
 // Instance transforms are rotation plus diagonal scale; inverse transpose columns.
 let a = v.m0.xyz; let b = v.m1.xyz; let c = v.m2.xyz;
 o.normal = normalize(a * v.normal.x / dot(a,a) + b * v.normal.y / dot(b,b) + c * v.normal.z / dot(c,c));
 o.color = v.color; o.world = world.xyz;
 return o;
}
@fragment fn fs_main(v: VertexOut) -> @location(0) vec4<f32> {
 let n = normalize(v.normal);
 let key = max(dot(n, normalize(vec3<f32>(-0.4,0.85,0.55))),0.0);
 let fill = max(dot(n, normalize(vec3<f32>(0.7,0.2,-0.5))),0.0);
 let light = 0.32 + key * 0.63 + fill * 0.22;
 return vec4<f32>(v.color.rgb * light,1.0);
}
