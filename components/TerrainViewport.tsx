import { Billboard, Html, Line, OrbitControls } from '@react-three/drei';
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { heightAt, interpolateLine, toWorld, WORLD_SCALE, ELEVATION_SCALE, type Feature, type Point2 } from '@/lib/scene';
import { useSceneStore } from '@/lib/store';

function TerrainSurface({ contours }: { contours: boolean }) {
  const geometry = useMemo(() => {
    const size = 81;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    const low = new THREE.Color('#827052');
    const mid = new THREE.Color('#a99970');
    const high = new THREE.Color('#7f765c');
    const rock = new THREE.Color('#756b5d');
    for (let z = 0; z < size; z += 1) {
      const north = -1000 + (z / (size - 1)) * 2000;
      for (let x = 0; x < size; x += 1) {
        const east = -1000 + (x / (size - 1)) * 2000;
        const elevation = heightAt(east, north);
        positions.push(east * WORLD_SCALE, elevation * ELEVATION_SCALE, -north * WORLD_SCALE);
        const riverCenter = -350 + 55 * Math.sin((east / 1000) * 4.1);
        const riverDistance = Math.abs(north - riverCenter);
        const slopeProbe = Math.abs(heightAt(east + 20, north) - heightAt(east - 20, north)) + Math.abs(heightAt(east, north + 20) - heightAt(east, north - 20));
        const base = elevation < 35 ? low.clone() : elevation < 90 ? mid.clone().lerp(high, (elevation - 35) / 55) : high.clone();
        if (slopeProbe > 18) base.lerp(rock, 0.58);
        if (riverDistance < 85) base.lerp(new THREE.Color('#74765f'), 0.35);
        colors.push(base.r, base.g, base.b);
      }
    }
    for (let z = 0; z < size - 1; z += 1) {
      for (let x = 0; x < size - 1; x += 1) {
        const a = z * size + x, b = a + 1, c = a + size, d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    buffer.setIndex(indices);
    buffer.computeVertexNormals();
    return buffer;
  }, []);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial vertexColors roughness={0.94} metalness={0.01} />
      </mesh>
      {contours && <mesh geometry={geometry} position={[0, 0.015, 0]}><meshBasicMaterial color="#625e4e" wireframe transparent opacity={0.16} /></mesh>}
      <mesh position={[0, -0.08, 0]} receiveShadow><boxGeometry args={[16.25, 0.35, 16.25]} /><meshStandardMaterial color="#6e6048" roughness={1} /></mesh>
    </group>
  );
}

function River() {
  const points = useMemo(() => Array.from({ length: 80 }, (_, i) => {
    const east = -1000 + (i / 79) * 2000;
    const north = -350 + 55 * Math.sin((east / 1000) * 4.1);
    return toWorld([east, north], 1.6);
  }), []);
  return <Line points={points} color="#4f7f87" lineWidth={10} transparent opacity={0.9} />;
}

function Tree({ position, scale = 1 }: { position: Point2; scale?: number }) {
  const world = toWorld(position);
  return <group position={world} scale={scale}><mesh position={[0, .12, 0]} castShadow><cylinderGeometry args={[.025,.035,.24,5]} /><meshStandardMaterial color="#63553d" /></mesh><mesh position={[0,.29,0]} castShadow><coneGeometry args={[.13,.32,6]} /><meshStandardMaterial color="#536044" roughness={1} /></mesh></group>;
}

function Building({ position, color = '#d9c4a0', scale = 1 }: { position: Point2; color?: string; scale?: number }) {
  const world = toWorld(position);
  return <group position={world} scale={scale}><mesh position={[0,.12,0]} castShadow><boxGeometry args={[.26,.24,.22]} /><meshStandardMaterial color={color} roughness={.9} /></mesh><mesh position={[0,.28,0]} rotation={[0,Math.PI/4,0]} castShadow><coneGeometry args={[.21,.17,4]} /><meshStandardMaterial color="#8f4f3d" roughness={.9} /></mesh></group>;
}

function Village() {
  const homes: Point2[] = [[-755,-675],[-705,-685],[-650,-660],[-745,-620],[-680,-610],[-620,-605]];
  const trees: Point2[] = [[-790,-630],[-720,-720],[-590,-650],[-625,-560]];
  return <group>{homes.map((point,i)=><Building key={i} position={point} scale={i===3?1.2:.85} />)}{trees.map((point,i)=><Tree key={i} position={point} scale={.8} />)}</group>;
}

function Farm({ position }: { position: Point2 }) {
  const world = toWorld(position, 0.5);
  return <group position={world}>
    {[0,1,2,3].map((row)=><mesh key={row} position={[(row-1.5)*.28,0.015,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.18,1.05]} /><meshStandardMaterial color={row%2?'#587445':'#6e8b54'} roughness={1} /></mesh>)}
    <group position={[.68,0,.28]}><mesh position={[0,.13,0]} castShadow><boxGeometry args={[.34,.26,.28]} /><meshStandardMaterial color="#d8c7a1" /></mesh><mesh position={[0,.32,0]} rotation={[0,Math.PI/4,0]}><coneGeometry args={[.25,.2,4]} /><meshStandardMaterial color="#8c5540" /></mesh></group>
  </group>;
}

function Bridge({ position, open, type }: { position: Point2; open: boolean; type: 'main' | 'east' }) {
  const world = toWorld(position, 2.8);
  return <group position={world} rotation={[0, type === 'main' ? -0.12 : 0.15, 0]}>
    <mesh castShadow><boxGeometry args={[type==='main'?.38:.32,.055,1.75]} /><meshStandardMaterial color={open ? (type==='main'?'#9d927b':'#7d684e') : '#9a4c39'} roughness={.9} /></mesh>
    {[-.16,.16].map((x)=><mesh key={x} position={[x,.09,0]}><boxGeometry args={[.025,.12,1.72]} /><meshStandardMaterial color="#50483b" /></mesh>)}
    {!open && <group position={[0,.22,0]}><mesh rotation={[0,0,Math.PI/4]}><boxGeometry args={[.75,.045,.045]} /><meshStandardMaterial color="#d76b42" /></mesh><mesh rotation={[0,0,-Math.PI/4]}><boxGeometry args={[.75,.045,.045]} /><meshStandardMaterial color="#d76b42" /></mesh></group>}
  </group>;
}

function RoadNetwork() {
  const { scene, selectedEdgeId, selectEdge } = useSceneStore();
  return <group>{scene.edges.map((edge) => {
    const color = edge.bridgeId && !scene.bridgeStatus[edge.bridgeId] ? '#a24935' : selectedEdgeId === edge.id ? '#ecb06c' : '#716c5c';
    return <Line key={edge.id} points={interpolateLine(edge.points,18).map((p)=>toWorld(p,1.2))} color={color} lineWidth={selectedEdgeId===edge.id?5:3} onClick={(event: ThreeEvent<MouseEvent>)=>{event.stopPropagation();selectEdge(edge.id);}} />;
  })}</group>;
}

function RouteLines() {
  const { primaryRoute, alternativeRoute, routeHoverIndex, selectEdge } = useSceneStore();
  const primaryPoints = primaryRoute?.geometry ? interpolateLine(primaryRoute.geometry, 12) : [];
  return <group>
    {alternativeRoute && <Line points={interpolateLine(alternativeRoute.geometry,18).map((p)=>toWorld(p,2.4))} color="#697b7a" lineWidth={3} dashed dashSize={.18} gapSize={.1} transparent opacity={.8} />}
    {primaryRoute && primaryRoute.status !== 'none' && <Line points={primaryPoints.map((p)=>toWorld(p,3.2))} color={primaryRoute.status==='review'?'#d79b32':'#d76539'} lineWidth={6} onClick={(event: ThreeEvent<MouseEvent>)=>{event.stopPropagation();const edgeId=primaryRoute.edgeIds[Math.min(primaryRoute.edgeIds.length-1,Math.floor(primaryRoute.edgeIds.length/2))];selectEdge(edgeId);}} />}
    {primaryRoute && routeHoverIndex !== null && primaryRoute.elevation[routeHoverIndex] && <mesh position={toWorld(primaryRoute.elevation[routeHoverIndex].point,5)}><sphereGeometry args={[.09,12,12]} /><meshStandardMaterial color="#fff5dc" emissive="#d76539" emissiveIntensity={1.4} /></mesh>}
  </group>;
}

function TruckModel() {
  const { scene, primaryRoute } = useSceneStore();
  const group = useRef<THREE.Group>(null);
  const [playing,setPlaying] = useState(false);
  const progress = useRef(0);
  useEffect(()=>{
    const start = () => { if (primaryRoute?.status !== 'none') { progress.current = 0; setPlaying(true); } };
    window.addEventListener('terrain:playback', start);
    return ()=>window.removeEventListener('terrain:playback', start);
  },[primaryRoute]);
  const path = useMemo(()=>primaryRoute && primaryRoute.status!=='none' ? interpolateLine(primaryRoute.geometry,8) : [],[primaryRoute]);
  useFrame((_,delta)=>{
    if(!playing || !group.current || !path.length) return;
    progress.current = Math.min(1,progress.current + delta/8);
    const index = Math.min(path.length-1,Math.floor(progress.current*(path.length-1)));
    const point = path[index];
    group.current.position.set(...toWorld(point,4));
    const next = path[Math.min(path.length-1,index+1)];
    const angle = Math.atan2(next[0]-point[0],next[1]-point[1]);
    group.current.rotation.y = angle;
    if(progress.current>=1)setPlaying(false);
  });
  const truck = scene.features.find((f)=>f.id==='truck')!;
  return <group ref={group} position={toWorld(truck.position,4)} scale={.9}>
    <mesh position={[0,.12,0]} castShadow><boxGeometry args={[.25,.18,.42]} /><meshStandardMaterial color="#d9653a" roughness={.7} /></mesh>
    <mesh position={[0,.25,.1]} castShadow><boxGeometry args={[.24,.19,.19]} /><meshStandardMaterial color="#e7dfc9" roughness={.7} /></mesh>
    {[[-.14,.02,.14],[.14,.02,.14],[-.14,.02,-.14],[.14,.02,-.14]].map((p,i)=><mesh key={i} position={p as [number,number,number]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.06,.06,.04,10]} /><meshStandardMaterial color="#2f302c" /></mesh>)}
  </group>;
}

function FeatureMarker({ feature }: { feature: Feature }) {
  const { labelsVisible, selectedFeatureId, selectFeature } = useSceneStore();
  const world = toWorld(feature.position, feature.type==='clearing'?4:6);
  const selected = selectedFeatureId===feature.id;
  if(feature.type==='truck')return null;
  return <group position={world} onClick={(event)=>{event.stopPropagation();selectFeature(feature.id);}}>
    <mesh><sphereGeometry args={[selected?.095:.065,12,12]} /><meshStandardMaterial color={feature.type==='farm'?'#668c52':feature.type==='bridge'?'#547884':feature.type==='clearing'?'#d49e35':'#d76539'} emissive={selected?'#f3b77d':'#000000'} emissiveIntensity={selected?.65:0} /></mesh>
    {labelsVisible && <Billboard position={[0,.18,0]}><Html center distanceFactor={9}><button className={`world-label ${selected?'selected':''}`} onClick={()=>selectFeature(feature.id)}>{feature.name}</button></Html></Billboard>}
  </group>;
}

function SparseVegetation() {
  const positions = useMemo<Point2[]>(()=>Array.from({length:42},(_,i)=>{
    const east = ((i*379)%1750)-875;
    let north = ((i*647)%1700)-850;
    const river = -350+55*Math.sin((east/1000)*4.1);
    if(Math.abs(north-river)<140)north+=220;
    return [east,north];
  }),[]);
  return <group>{positions.map((p,i)=><Tree key={i} position={p} scale={.45+(i%4)*.1} />)}</group>;
}

function CameraRig() {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  const { scene, cameraBookmark, cameraNonce } = useSceneStore();
  const targetPosition = useRef(new THREE.Vector3(...scene.cameraBookmarks.overview.position));
  const targetLook = useRef(new THREE.Vector3(...scene.cameraBookmarks.overview.target));
  const animating = useRef(true);
  useEffect(()=>{
    const bookmark=scene.cameraBookmarks[cameraBookmark];
    targetPosition.current.set(...bookmark.position);
    targetLook.current.set(...bookmark.target);
    animating.current=true;
  },[cameraBookmark,cameraNonce,scene.cameraBookmarks]);
  useFrame((_,delta)=>{
    if(!animating.current)return;
    const alpha=1-Math.exp(-delta*3.2);
    camera.position.lerp(targetPosition.current,alpha);
    if(controls.current)controls.current.target.lerp(targetLook.current,alpha);
    controls.current?.update();
    if(camera.position.distanceTo(targetPosition.current)<.03){camera.position.copy(targetPosition.current);animating.current=false;}
  });
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={4} maxDistance={25} maxPolarAngle={Math.PI/2.15} target={[0,0,0]} />;
}

export default function TerrainViewport() {
  const { scene, contoursVisible, selectFeature } = useSceneStore();
  const farm = scene.features.find((feature)=>feature.id==='farm')!;
  return <div className="scene-canvas" aria-label="Interactive 3D terrain model. Orbit, pan, and zoom are available with pointer controls.">
    <Canvas shadows dpr={[1,1.65]} gl={{ antialias:true, alpha:false }} camera={{position:[11,11,13],fov:38,near:.1,far:80}} onPointerMissed={()=>selectFeature('ridge')}>
      <color attach="background" args={['#ced5cf']} />
      <fog attach="fog" args={['#ced5cf',18,35]} />
      <ambientLight intensity={1.25} />
      <hemisphereLight args={['#e9eee6','#6d604b',1.1]} />
      <directionalLight castShadow intensity={2.45} position={[-5,14,7]} shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
      <TerrainSurface contours={contoursVisible} />
      <River />
      <RoadNetwork />
      <RouteLines />
      <Village />
      <Farm position={farm.position} />
      <Bridge position={[-260,-350]} open={scene.bridgeStatus['main-bridge']} type="main" />
      <Bridge position={[430,-350]} open={scene.bridgeStatus['east-bridge']} type="east" />
      <SparseVegetation />
      <TruckModel />
      {scene.features.map((feature)=><FeatureMarker key={feature.id} feature={feature} />)}
      <CameraRig />
    </Canvas>
  </div>;
}
