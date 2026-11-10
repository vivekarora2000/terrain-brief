import { useMemo } from 'react';
import { useSceneStore } from '@/lib/store';

export default function ElevationProfile() {
  const { primaryRoute, routeHoverIndex, setRouteHoverIndex } = useSceneStore();
  const chart = useMemo(() => {
    if (!primaryRoute || primaryRoute.status === 'none' || primaryRoute.elevation.length < 2) return null;
    const samples = primaryRoute.elevation;
    const width = 680, height = 86, padX = 18, padY = 12;
    const min = Math.min(...samples.map((sample) => sample.elevationM));
    const max = Math.max(...samples.map((sample) => sample.elevationM));
    const points = samples.map((sample) => {
      const x = padX + (sample.distanceM / primaryRoute.distanceM) * (width - padX * 2);
      const y = height - padY - ((sample.elevationM - min) / Math.max(1, max - min)) * (height - padY * 2);
      return [x, y] as const;
    });
    const line = points.map((point) => point.join(',')).join(' ');
    const area = `${padX},${height-padY} ${line} ${width-padX},${height-padY}`;
    return { width, height, min, max, points, line, area };
  }, [primaryRoute]);
  if (!chart || !primaryRoute) return null;
  const hover = routeHoverIndex !== null ? chart.points[routeHoverIndex] : null;
  return <section className="elevation-panel" aria-label="Route elevation profile">
    <div className="profile-summary">
      <span className={`route-status ${primaryRoute.status}`}><i />{primaryRoute.status === 'review' ? 'REQUIRES REVIEW' : 'CANDIDATE ROUTE'}</span>
      <div><strong>{(primaryRoute.distanceM/1000).toFixed(2)} km</strong><small>DISTANCE</small></div>
      <div><strong>{primaryRoute.maxGradePercent.toFixed(1)}%</strong><small>MAX GRADE</small></div>
      <div><strong>{primaryRoute.edgeIds.length}</strong><small>SEGMENTS</small></div>
    </div>
    <div className="profile-chart">
      <div className="profile-title"><span>Elevation profile</span><small>{Math.round(chart.min)}–{Math.round(chart.max)} m · sampled every 25 m</small></div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} preserveAspectRatio="none" role="img" aria-label="Elevation along selected candidate route" onMouseLeave={()=>setRouteHoverIndex(null)} onMouseMove={(event)=>{
        const rect=event.currentTarget.getBoundingClientRect();
        const ratio=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
        setRouteHoverIndex(Math.round(ratio*(primaryRoute.elevation.length-1)));
      }}>
        <defs><linearGradient id="elevation-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d5683d" stopOpacity=".28"/><stop offset="1" stopColor="#d5683d" stopOpacity=".02"/></linearGradient></defs>
        <line x1="18" y1="74" x2="662" y2="74" stroke="#d8d1c3" strokeWidth="1" />
        <polygon points={chart.area} fill="url(#elevation-fill)" />
        <polyline points={chart.line} fill="none" stroke="#c95f37" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {hover && <><line x1={hover[0]} y1="8" x2={hover[0]} y2="74" stroke="#9f9a8e" strokeDasharray="2 2"/><circle cx={hover[0]} cy={hover[1]} r="4" fill="#fff9ed" stroke="#c95f37" strokeWidth="2" vectorEffect="non-scaling-stroke" /></>}
      </svg>
    </div>
  </section>;
}
