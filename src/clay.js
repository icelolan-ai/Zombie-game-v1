import * as T from '../vendor/three.module.js';

// Shared procedural surface: no image downloads, texture seams or per-object maps.
export function clayMaterial(options={}){
 const material=new T.MeshStandardMaterial({roughness:.9,metalness:0,...options});
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vClayPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nvClayPosition = position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vClayPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   float clayGrain = sin(dot(vClayPosition,vec3(31.7,43.2,27.1))) * sin(dot(vClayPosition,vec3(57.3,19.1,39.7)));
   float clayThumb = sin(vClayPosition.y*8.0 + sin(vClayPosition.x*5.0) + vClayPosition.z*4.0);
   diffuseColor.rgb *= 1.0 + clayGrain*.025 + clayThumb*.018;`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   normal = normalize(normal + .018*sin(vClayPosition.yzx*23.0 + vClayPosition.xyz*7.0));`);
 };
 material.customProgramCacheKey=()=> 'handmade-clay-v06';
 return material;
}
