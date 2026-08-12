import * as THREE from "three";
import { getSectorRoom, type SectorRoomId } from "./sectorNewsroom";

export type ThreeNewsroomHandle = { dispose: () => void };

const STYLE_REFERENCE = "/manus-storage/six-sector-newsroom-style-reference_a5c92849.png";

export function createThreeSectorNewsroom(canvas: HTMLCanvasElement, sectorId: SectorRoomId, reducedMotion: boolean): ThreeNewsroomHandle {
  const theme = getSectorRoom(sectorId);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setSize(Math.max(canvas.clientWidth, 320), Math.max(canvas.clientHeight, 300), false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(theme.wall);
  const camera = new THREE.PerspectiveCamera(42, Math.max(canvas.clientWidth, 320) / Math.max(canvas.clientHeight, 300), 0.1, 100);
  camera.position.set(0, 3.6, 11.6);
  camera.lookAt(0, 2.2, 0);

  scene.add(new THREE.HemisphereLight(theme.glow, theme.wall, 2.0));
  const lamp = new THREE.PointLight(theme.glow, 30, 18, 2);
  lamp.position.set(0, 5.2, 2);
  scene.add(lamp);
  const rim = new THREE.PointLight(theme.accent, 12, 14, 2);
  rim.position.set(-5, 2.5, -1);
  scene.add(rim);

  const room = new THREE.Group();
  scene.add(room);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7.4, 48), new THREE.MeshStandardMaterial({ color: "#091b20", roughness: 0.76, metalness: 0.22 }));
  floor.rotation.x = -Math.PI / 2;
  room.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(13.2, 6.6), new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.62, metalness: 0.12, emissive: new THREE.Color(theme.wall), emissiveIntensity: 0.22 }));
  wall.position.set(0, 3.25, -3.1);
  room.add(wall);
  const texture = new THREE.TextureLoader().load(STYLE_REFERENCE);
  texture.colorSpace = THREE.SRGBColorSpace;
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(7.8, 3.5), new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.2, color: new THREE.Color(theme.glow) }));
  banner.position.set(0, 3.45, -3.02);
  room.add(banner);

  const deskMaterial = new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.32, metalness: 0.58, emissive: new THREE.Color(theme.accent), emissiveIntensity: 0.12 });
  const deskBase = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.75, 1.65), deskMaterial);
  deskBase.position.set(0, 1.3, 0);
  room.add(deskBase);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(6.15, 0.15, 1.9), new THREE.MeshStandardMaterial({ color: "#1b393b", roughness: 0.25, metalness: 0.35 }));
  deskTop.position.set(0, 1.73, 0);
  room.add(deskTop);

  const chief = new THREE.Group();
  chief.position.set(0, 1.75, 0.8);
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.82, 1.82, 20), new THREE.MeshStandardMaterial({ color: "#1a3454", roughness: 0.62 }));
  robe.position.y = 0.7;
  chief.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.43, 20, 18), new THREE.MeshStandardMaterial({ color: "#cfa07e", roughness: 0.7 }));
  head.position.y = 1.72;
  chief.add(head);
  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.2, 20), new THREE.MeshStandardMaterial({ color: "#edf0e7", roughness: 0.88 }));
  beard.position.set(0, 1.18, 0.25);
  beard.rotation.x = Math.PI;
  chief.add(beard);
  room.add(chief);

  const couriers = [-1, 1].map((side, index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 14), new THREE.MeshStandardMaterial({ color: "#2869c5", roughness: 0.42, emissive: "#163b76", emissiveIntensity: 0.38 }));
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.48), new THREE.MeshStandardMaterial({ color: "#ecd99f", emissive: "#8a6a28", emissiveIntensity: 0.18, side: THREE.DoubleSide }));
    paper.position.set(-side * 0.18, 0.6, -0.05);
    paper.rotation.x = -0.55;
    group.add(body, paper);
    room.add(group);
    return { group, side, phase: index * Math.PI };
  });

  let frame = 0;
  const started = performance.now();
  const render = () => {
    frame = requestAnimationFrame(render);
    const seconds = (performance.now() - started) / 1000;
    if (!reducedMotion) {
      couriers.forEach(({ group, side, phase }) => {
        group.position.set(side * (2.2 + Math.sin(seconds * 1.05 + phase) * 2.35), 0.65 + Math.abs(Math.sin(seconds * 2.1 + phase)) * 0.14, 0.45 + Math.cos(seconds + phase) * 0.32);
        group.rotation.y = side * (0.35 + Math.sin(seconds + phase) * 0.18);
      });
      chief.rotation.z = Math.sin(seconds * 0.72) * 0.024;
    } else {
      couriers.forEach(({ group, side }) => group.position.set(side * 2.35, 0.65, 0.45));
    }
    renderer.render(scene, camera);
  };
  render();
  const resize = () => {
    const width = Math.max(canvas.clientWidth, 320);
    const height = Math.max(canvas.clientHeight, 300);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };
  window.addEventListener("resize", resize);
  return { dispose: () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); const material = object.material; if (Array.isArray(material)) material.forEach(item => item.dispose()); else material.dispose(); } }); texture.dispose(); renderer.dispose(); } };
}
