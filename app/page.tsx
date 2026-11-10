import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Box, Check, ChevronDown, CircleAlert, Compass, Download,
  Eye, FileUp, Gauge, Layers3, MapPin, Mountain, PanelRight, Play, Redo2, RotateCcw,
  Route, Send, Sparkles, Truck, Undo2, X, ListTree, MessageSquareText, Info,
} from 'lucide-react';
import TerrainViewport from '@/components/TerrainViewport';
import ElevationProfile from '@/components/ElevationProfile';
import { edgeMetrics, terrainLineOfSight } from '@/lib/scene';
import { useSceneStore } from '@/lib/store';

const commandExamples = [
  'How can the truck reach the clearing?',
  'Close the main bridge.',
  'Move the farm farther north.',
];

function Topbar() {
  const { scene, presentation, togglePresentation, exportScene, importScene, history, future, undo, redo } = useSceneStore();
  const fileRef = useRef<HTMLInputElement>(null);
  return <header className="topbar atlas-topbar">
    <div className="brand-mark"><Mountain size={15} strokeWidth={2.2} /></div>
    <div className="brand-copy"><strong>TERRAIN BRIEF</strong></div>
    <div className="scene-title"><span>{scene.title}</span><em>Illustrative scene</em><small>LOCAL METRIC GRID · 2 × 2 KM</small></div>
    <div className="revision-controls">
      <button aria-label="Undo scene edit" disabled={!history.length} onClick={undo}><Undo2 size={14}/></button>
      <button aria-label="Redo scene edit" disabled={!future.length} onClick={redo}><Redo2 size={14}/></button>
      <span>REV {String(scene.revision).padStart(2,'0')}</span>
    </div>
    <div className="header-actions">
      <button className="ghost-button" title={presentation?'Exit presentation':'Present'} onClick={togglePresentation}>{presentation?<X size={14}/>:<Play size={14}/>}<span>{presentation?'Exit':'Present'}</span></button>
      <button className="ghost-button icon-only" title="Import scene" onClick={()=>fileRef.current?.click()}><FileUp size={14}/></button>
      <button className="ghost-button icon-only" title="Export scene" onClick={exportScene}><Download size={14}/></button>
      <input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event)=>event.target.files?.[0]&&importScene(event.target.files[0])}/>
    </div>
  </header>;
}

function BriefPanel() {
  const { messages, isThinking, runCommand, scene, activeMobileTab } = useSceneStore();
  const [input,setInput]=useState('');
  const threadRef=useRef<HTMLDivElement>(null);
  useEffect(()=>threadRef.current?.scrollTo({top:threadRef.current.scrollHeight,behavior:'smooth'}),[messages,isThinking]);
  const submit=async(value=input)=>{const next=value.trim();if(!next)return;setInput('');await runCommand(next);};
  return <aside className={`brief-panel panel mobile-pane ${activeMobileTab==='brief'?'active':''}`}>
    <div className="panel-heading"><span>01</span><div><strong>Brief</strong><small><i className="demo-dot"/> DETERMINISTIC DEMO MODE</small></div></div>
    <div className="scenario-summary">
      <p className="eyebrow">SEEDED SCENARIO</p>
      <h1>A dry river valley below an eastern ridge.</h1>
      <p>A village, farm, clearing, and two crossings form a compact civilian delivery scene.</p>
    </div>
    <div className="conversation-thread" ref={threadRef} aria-live="polite">
      {messages.map((message)=><article key={message.id} className={`message ${message.role} ${message.status??''}`}>
        {message.role==='assistant'&&<div className="avatar"><Sparkles size={13}/></div>}
        <div><strong>{message.role==='assistant'?'Terrain Brief':'You'}</strong><p>{message.text}</p>{message.detail&&<small>{message.detail}</small>}</div>
      </article>)}
      {isThinking&&<article className="message assistant loading"><div className="avatar"><Sparkles size={13}/></div><div><strong>Validating command</strong><p><span/><span/><span/></p></div></article>}
    </div>
    <div className="suggestion-strip">
      {commandExamples.map((command)=><button key={command} onClick={()=>submit(command)}>{command}</button>)}
    </div>
    <form className="command-form" onSubmit={(event)=>{event.preventDefault();submit();}}>
      <label htmlFor="terrain-command">Describe a change</label>
      <div><input id="terrain-command" value={input} onChange={(event)=>setInput(event.target.value)} placeholder="Ask about the scene…" maxLength={220}/><button aria-label="Send command" disabled={!input.trim()||isThinking}><Send size={16}/></button></div>
      <small>Validated against scene revision {scene.revision} · scripted, not model-generated</small>
    </form>
  </aside>;
}

function Stage() {
  const {
    scene, labelsVisible, contoursVisible, toggleLabels, toggleContours, resetCamera, primaryRoute,
    alternativeRoute, cameraBookmark, presentation, nextPresentationStep,
  } = useSceneStore();
  const [webglAvailable,setWebglAvailable]=useState(true);
  useEffect(()=>{try{const canvas=document.createElement('canvas');setWebglAvailable(Boolean(canvas.getContext('webgl2')||canvas.getContext('webgl')));}catch{setWebglAvailable(false);}},[]);
  return <section className="terrain-stage">
    <div className="stage-bar atlas-stage-tools">
      <div className="view-readout"><span className="live-dot"/> {cameraBookmark.toUpperCase()} · REV {scene.revision}</div>
      <div className="stage-tools">
        <button className={contoursVisible?'active':''} title="Toggle contours" aria-pressed={contoursVisible} onClick={toggleContours}><Layers3 size={14}/><span>Contours</span></button>
        <button className={labelsVisible?'active':''} title="Toggle labels" aria-pressed={labelsVisible} onClick={toggleLabels}><Box size={14}/><span>Labels</span></button>
        <button title="Reset view" onClick={resetCamera}><Compass size={14}/><span>Reset</span></button>
      </div>
    </div>
    {webglAvailable?<TerrainViewport/>:<div className="webgl-fallback"><Mountain size={34}/><h2>3D view unavailable</h2><p>{scene.assumptions[0]} The briefing, route results, settings, and export remain available.</p></div>}
    <div className="stage-legend">
      <span><i className="legend-road"/>Road</span>
      {primaryRoute&&primaryRoute.status!=='none'&&<span><i className={primaryRoute.status==='review'?'legend-review':'legend-route'}/>Primary</span>}
      {alternativeRoute&&<span><i className="legend-alt"/>Alternative</span>}
    </div>
    <div className="scale-bar"><i/> 500 m</div>
    {primaryRoute&&primaryRoute.status!=='none'&&<button className="route-playback" onClick={()=>window.dispatchEvent(new Event('terrain:playback'))}><Play size={13} fill="currentColor"/> Play route</button>}
    {presentation&&<div className="presentation-nav"><button aria-label="Previous viewpoint" onClick={()=>nextPresentationStep(-1)}><ArrowLeft size={18}/></button><div><small>BRIEFING VIEW</small><strong>{scene.cameraBookmarks[cameraBookmark].label}</strong></div><button aria-label="Next viewpoint" onClick={()=>nextPresentationStep(1)}><ArrowRight size={18}/></button></div>}
  </section>;
}

function RouteInspector() {
  const { primaryRoute, alternativeRoute, routeMode, setRouteMode, selectEdge, scene } = useSceneStore();
  if (!primaryRoute) return <section className="empty-route">
    <div className="route-symbol"><Route size={21}/></div><h3>No route selected</h3><p>Ask how the relief truck can reach the clearing to calculate a route over the authored road graph.</p>
    <button onClick={()=>useSceneStore.getState().runCommand('How can the truck reach the clearing?')}><Route size={14}/> Calculate route</button>
  </section>;
  if(primaryRoute.status==='none')return <section className="no-route"><CircleAlert size={20}/><h3>No route under current constraints</h3><p>{primaryRoute.reason}</p></section>;
  return <section className="route-inspector">
    <div className={`candidate-banner ${primaryRoute.status}`}><span>{primaryRoute.status==='review'?<CircleAlert size={15}/>:<Check size={15}/>}</span><div><strong>{primaryRoute.status==='review'?'Requires review':'Candidate under current assumptions'}</strong><small>{(primaryRoute.distanceM/1000).toFixed(2)} km · {primaryRoute.edgeIds.length} segments</small></div></div>
    <div className="mode-switch"><div><strong>Unknown attributes</strong><small>How routing treats missing clearance data</small></div><select aria-label="Unknown attribute routing mode" value={routeMode} onChange={(event)=>setRouteMode(event.target.value as 'strict'|'exploratory')}><option value="exploratory">Exploratory</option><option value="strict">Strict</option></select></div>
    <div className="route-checks"><p className="eyebrow">CONSTRAINT CHECKS</p>{primaryRoute.checks.map((check)=><div key={check.label} className={`check-row ${check.status}`}><span>{check.status==='pass'?<Check size={12}/>:<CircleAlert size={12}/>}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></div>)}</div>
    <div className="segment-list"><p className="eyebrow">ROUTE SEGMENTS</p>{primaryRoute.edgeIds.map((id,index)=>{const edge=scene.edges.find((item)=>item.id===id)!;return <button key={id} onClick={()=>selectEdge(id)}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{edge.name}</strong><small>{edge.surface} · {edge.widthM.toFixed(1)} m wide</small></div><PanelRight size={13}/></button>})}</div>
    {alternativeRoute&&<button className="alternative-row" onClick={()=>selectEdge(alternativeRoute.edgeIds.find((id)=>!primaryRoute.edgeIds.includes(id))??alternativeRoute.edgeIds[0])}><span/><div><strong>Alternative candidate</strong><small>{(alternativeRoute.distanceM/1000).toFixed(2)} km · inspect distinct segments</small></div></button>}
  </section>;
}

function FeatureInspector() {
  const { scene, selectedFeatureId, selectFeature, updateVehicle, setBookmark } = useSceneStore();
  const feature=scene.features.find((item)=>item.id===selectedFeatureId)??scene.features[0];
  const [los,setLos]=useState<ReturnType<typeof terrainLineOfSight>|null>(null);
  return <>
    <section className="selected-summary"><p className="eyebrow">SELECTED FEATURE</p><div className="feature-title"><span className={`feature-icon ${feature.type}`}>{feature.type==='truck'?<Truck size={17}/>:<MapPin size={17}/>}</span><div><h2>{feature.name}</h2><small>{feature.type.toUpperCase()} · {feature.provenance.toUpperCase()}</small></div></div><p>{feature.description}</p><div className="coordinate-row"><span>E {feature.position[0]} m</span><span>N {feature.position[1]} m</span></div></section>
    <section className="feature-list"><div className="section-title"><p className="eyebrow">SCENE FEATURES</p><small>{scene.features.length} total</small></div>{scene.features.filter((item)=>item.id!=='ridge').map((item)=><button className={item.id===feature.id?'selected':''} key={item.id} onClick={()=>selectFeature(item.id)}><span className={`feature-dot ${item.type}`}/><div>{item.name}<small>{item.type}</small></div><em>{item.provenance==='explicit'?'E':item.provenance==='assumed'?'A':'C'}</em></button>)}</section>
    <section className="vehicle-settings"><div className="section-title"><p className="eyebrow">VEHICLE PROFILE</p><Truck size={14}/></div><div className="field-grid"><label>Width<input type="number" min="1.5" max="4" step="0.1" value={scene.vehicle.widthM} onChange={(event)=>updateVehicle({widthM:Number(event.target.value)})}/><span>m</span></label><label>Height<input type="number" min="1.5" max="5" step="0.1" value={scene.vehicle.heightM} onChange={(event)=>updateVehicle({heightM:Number(event.target.value)})}/><span>m</span></label><label>Weight<input type="number" min="2" max="20" step="0.5" value={scene.vehicle.weightT} onChange={(event)=>updateVehicle({weightT:Number(event.target.value)})}/><span>t</span></label><label>Max grade<input type="number" min="4" max="35" step="1" value={scene.vehicle.maxGradePercent} onChange={(event)=>updateVehicle({maxGradePercent:Number(event.target.value)})}/><span>%</span></label></div><small>Illustrative configuration; not manufacturer verified.</small></section>
    <section className="visibility-tool"><div className="section-title"><p className="eyebrow">TERRAIN VISIBILITY</p><Eye size={14}/></div><p>Village to ridge clearing · endpoints 2 m above terrain.</p><button onClick={()=>setLos(terrainLineOfSight([-720,-650],[700,230],2,2))}>Inspect line of sight</button>{los&&<div className={los.visible?'visible':'blocked'}><strong>{los.visible?'Terrain-only visibility is clear':'Terrain blocks the sightline'}</strong><small>{los.visible?'Buildings and vegetation are excluded.':`First obstruction near E ${Math.round(los.obstruction![0])}, N ${Math.round(los.obstruction![1])} m.`}</small></div>}</section>
    <div className="bookmark-buttons"><button onClick={()=>setBookmark('village')}>Village view</button><button onClick={()=>setBookmark('clearing')}>Clearing view</button></div>
  </>;
}

function EdgeInspector() {
  const { scene, selectedEdgeId, selectEdge, primaryRoute } = useSceneStore();
  const edge=scene.edges.find((item)=>item.id===selectedEdgeId);
  if(!edge)return null;
  const metrics=edgeMetrics(edge);
  const open=!edge.bridgeId||scene.bridgeStatus[edge.bridgeId];
  const inRoute=primaryRoute?.edgeIds.includes(edge.id);
  const widthPass=edge.widthM>=scene.vehicle.widthM+.4;
  const gradePass=metrics.maxGradePercent<=scene.vehicle.maxGradePercent;
  const unknown=edge.unknownAttributes.length>0;
  return <section className="edge-inspector">
    <button className="back-button" onClick={()=>selectEdge(null)}><ArrowLeft size={13}/> Back to scene</button>
    <p className="eyebrow">ROAD SEGMENT</p><h2>{edge.name}</h2><span className={`edge-status ${!open?'closed':unknown?'review':'pass'}`}>{!open?'CLOSED':unknown?'REVIEW REQUIRED':inRoute?'ON CANDIDATE':'AVAILABLE'}</span>
    <div className="edge-metrics"><div><small>LENGTH</small><strong>{Math.round(metrics.lengthM)} m</strong></div><div><small>SURFACE</small><strong>{edge.surface}</strong></div><div><small>WIDTH</small><strong>{edge.widthM.toFixed(1)} m</strong></div><div><small>MAX GRADE</small><strong>{metrics.maxGradePercent.toFixed(1)}%</strong></div></div>
    <div className="why-card"><h3>Why {inRoute?'this road?':'not this road?'}</h3><div className={open?'pass':'fail'}><span>{open?<Check size={12}/>:<X size={12}/>}</span><p><strong>Bridge status</strong><small>{open?'Segment is open.':`${edge.name} is closed and excluded from graph connectivity.`}</small></p></div><div className={widthPass?'pass':'fail'}><span>{widthPass?<Check size={12}/>:<X size={12}/>}</span><p><strong>Width margin</strong><small>{widthPass?`${(edge.widthM-scene.vehicle.widthM).toFixed(1)} m wider than vehicle.`:'Below the configured 0.4 m margin.'}</small></p></div><div className={gradePass?'pass':'fail'}><span>{gradePass?<Check size={12}/>:<X size={12}/>}</span><p><strong>Sampled grade</strong><small>{metrics.maxGradePercent.toFixed(1)}% against {scene.vehicle.maxGradePercent}% configured maximum.</small></p></div>{unknown&&<div className="review"><span><CircleAlert size={12}/></span><p><strong>Unknown attributes</strong><small>{edge.unknownAttributes.join('; ')}. Compatibility is not verified.</small></p></div>}</div>
    <div className="sampling-note"><Gauge size={14}/><p><strong>Computation note</strong><small>Elevation and grade use the same terrain heightfield as the 3D scene, sampled every 25 m.</small></p></div>
  </section>;
}

function InspectorPanel() {
  const { selectedEdgeId, activeMobileTab, importError } = useSceneStore();
  const [tab,setTab]=useState<'feature'|'route'>('feature');
  const primaryRoute=useSceneStore((state)=>state.primaryRoute);
  useEffect(()=>{if(primaryRoute)setTab('route');},[primaryRoute?.id]);
  return <aside className={`inspect-panel panel mobile-pane ${activeMobileTab==='inspect'?'active':''}`}>
    <div className="panel-heading"><span>02</span><div><strong>Inspect</strong><small>{selectedEdgeId?'SEGMENT DETAIL':'SCENE & ROUTE'}</small></div></div>
    {importError&&<div className="import-error"><CircleAlert size={14}/>{importError}</div>}
    {selectedEdgeId?<EdgeInspector/>:<><div className="inspector-tabs"><button className={tab==='feature'?'active':''} onClick={()=>setTab('feature')}>Scene</button><button className={tab==='route'?'active':''} onClick={()=>setTab('route')}>Route {primaryRoute&&<i/>}</button></div>{tab==='feature'?<FeatureInspector/>:<RouteInspector/>}</>}
  </aside>;
}

function MobileNavigation() {
  const {activeMobileTab,setMobileTab,primaryRoute}=useSceneStore();
  return <nav className="mobile-nav" aria-label="Application sections"><button className={activeMobileTab==='brief'?'active':''} onClick={()=>setMobileTab('brief')}><Sparkles size={17}/>Brief</button><button className={activeMobileTab==='scene'?'active':''} onClick={()=>setMobileTab('scene')}><Mountain size={17}/>Scene</button><button className={activeMobileTab==='inspect'?'active':''} onClick={()=>setMobileTab('inspect')}><PanelRight size={17}/>Inspect{primaryRoute&&<i/>}</button></nav>;
}

function SceneOutline() {
  const {scene,selectedFeatureId,selectFeature,primaryRoute}=useSceneStore();
  const grouped=[
    {label:'PLACES',items:scene.features.filter((item)=>['village','farm','clearing'].includes(item.type))},
    {label:'INFRASTRUCTURE',items:scene.features.filter((item)=>['bridge','truck'].includes(item.type))},
  ];
  return <aside className="scene-outline" aria-label="Scene outline">
    <div className="outline-heading"><ListTree size={13}/><strong>SCENE OUTLINE</strong><span>{scene.features.length}</span></div>
    {grouped.map((group)=><section key={group.label}><p>{group.label}</p>{group.items.map((feature)=><button key={feature.id} className={selectedFeatureId===feature.id?'selected':''} onClick={()=>selectFeature(feature.id)}><i className={`feature-dot ${feature.type}`}/><span>{feature.name}</span>{feature.type==='bridge'&&<em className={scene.bridgeStatus[feature.id as 'main-bridge'|'east-bridge']?'open':'closed'}>{scene.bridgeStatus[feature.id as 'main-bridge'|'east-bridge']?'OPEN':'CLOSED'}</em>}</button>)}</section>)}
    <section className="outline-route"><p>ROUTE</p><button className={primaryRoute?'active':''} onClick={()=>primaryRoute&&useSceneStore.getState().setInspectorVisible(true)}><i/><span>{primaryRoute?primaryRoute.status==='review'?'Candidate · review':'Primary candidate':'Not calculated'}</span>{primaryRoute&&<em>{(primaryRoute.distanceM/1000).toFixed(2)} km</em>}</button></section>
    <div className="outline-key"><span><b>E</b>User</span><span><b>A</b>Assumed</span><span><b>C</b>Computed</span></div>
  </aside>;
}

function ContextInspector() {
  const {inspectorVisible,setInspectorVisible,selectedEdgeId,primaryRoute}=useSceneStore();
  const [tab,setTab]=useState<'feature'|'route'>('feature');
  useEffect(()=>{if(selectedEdgeId)setTab('feature');},[selectedEdgeId]);
  useEffect(()=>{if(primaryRoute)setTab('route');},[primaryRoute?.id]);
  if(!inspectorVisible)return <button className="open-inspector" onClick={()=>setInspectorVisible(true)}><PanelRight size={15}/> Inspect</button>;
  return <aside className="context-inspector" aria-label="Context inspector">
    <header><div><small>INSPECTOR</small><strong>{selectedEdgeId?'Road segment':tab==='route'?'Candidate route':'Selected feature'}</strong></div><button aria-label="Close inspector" onClick={()=>setInspectorVisible(false)}><X size={15}/></button></header>
    {selectedEdgeId?<EdgeInspector/>:<><nav><button className={tab==='feature'?'active':''} onClick={()=>setTab('feature')}>Feature</button><button className={tab==='route'?'active':''} onClick={()=>setTab('route')}>Route{primaryRoute&&<i/>}</button></nav><div className="inspector-scroll">{tab==='feature'?<FeatureInspector/>:<RouteInspector/>}</div></>}
  </aside>;
}

function ConversationDrawer({open,onClose}:{open:boolean;onClose:()=>void}) {
  const {messages,isThinking}=useSceneStore();
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(open)ref.current?.scrollTo({top:ref.current.scrollHeight});},[open,messages]);
  if(!open)return null;
  return <aside className="conversation-drawer" aria-label="Conversation history">
    <header><div><small>DEMO MODE · SCRIPTED</small><strong>Conversation history</strong></div><button aria-label="Close history" onClick={onClose}><X size={15}/></button></header>
    <div className="history-thread" ref={ref}>{messages.map((message)=><article key={message.id} className={`${message.role} ${message.status??''}`}><span>{message.role==='assistant'?'TB':'YOU'}</span><div><strong>{message.text}</strong>{message.detail&&<p>{message.detail}</p>}</div></article>)}{isThinking&&<article className="assistant"><span>TB</span><div><strong>Validating command…</strong></div></article>}</div>
    <footer><Info size={12}/>Commands are deterministic in demo mode and validated against the current scene revision.</footer>
  </aside>;
}

function CommandStrip({historyOpen,onToggleHistory}:{historyOpen:boolean;onToggleHistory:()=>void}) {
  const {messages,isThinking,runCommand,undo,history,scene}=useSceneStore();
  const [input,setInput]=useState('');
  const [examplesOpen,setExamplesOpen]=useState(false);
  const last=messages.at(-1);
  const receipt=last?.role==='assistant'&&messages.length>1?last:null;
  const submit=async(value=input)=>{const command=value.trim();if(!command)return;setInput('');setExamplesOpen(false);await runCommand(command);};
  return <div className={`command-zone ${historyOpen?'history-open':''}`}>
    {receipt&&<div className={`change-receipt ${receipt.status??''}`}><span>{receipt.status==='error'?<CircleAlert size={13}/>:receipt.status==='review'?<CircleAlert size={13}/>:<Check size={13}/>}</span><p><strong>{receipt.text}</strong>{receipt.detail&&<small>{receipt.detail}</small>}</p>{history.length>0&&receipt.status!=='error'&&<button onClick={undo}>Undo</button>}</div>}
    {examplesOpen&&<div className="command-examples">{commandExamples.map((example)=><button key={example} onClick={()=>submit(example)}>{example}</button>)}<button onClick={()=>submit('Reopen the main bridge.')}>Reopen the main bridge.</button><button onClick={()=>submit('Show the view from the village.')}>Show the village view.</button></div>}
    <form className="atlas-command" onSubmit={(event)=>{event.preventDefault();submit();}}>
      <button type="button" className={`history-toggle ${historyOpen?'active':''}`} onClick={onToggleHistory} aria-label="Toggle conversation history"><MessageSquareText size={16}/><i>{messages.length}</i></button>
      <div className="command-input"><span className="prompt-glyph">›</span><input aria-label="Describe the scene or ask a question" value={input} onChange={(event)=>setInput(event.target.value)} placeholder="Describe the scene or ask a question…" maxLength={220}/><button type="button" className="example-toggle" onClick={()=>setExamplesOpen(!examplesOpen)} aria-label="Show example commands"><ChevronDown size={14}/></button></div>
      <span className="revision-stamp">REV {scene.revision}</span>
      <button className="submit-command" aria-label="Submit command" disabled={!input.trim()||isThinking}>{isThinking?<RotateCcw className="spin" size={15}/>:<Send size={15}/>}</button>
    </form>
  </div>;
}

export default function Home() {
  const {primaryRoute,presentation,hydrate}=useSceneStore();
  const [historyOpen,setHistoryOpen]=useState(false);
  useEffect(()=>{hydrate();},[hydrate]);
  return <main className={`app-shell atlas-shell ${primaryRoute&&primaryRoute.status!=='none'?'route-open':''} ${presentation?'presenting':''}`}>
    <Topbar/>
    <section className="workspace atlas-workspace">
      <div className="center-column"><Stage/>{primaryRoute&&primaryRoute.status!=='none'&&<ElevationProfile/>}</div>
      <SceneOutline/>
      <ContextInspector/>
      <ConversationDrawer open={historyOpen} onClose={()=>setHistoryOpen(false)}/>
      {!presentation&&<CommandStrip historyOpen={historyOpen} onToggleHistory={()=>setHistoryOpen(!historyOpen)}/>} 
    </section>
  </main>;
}
