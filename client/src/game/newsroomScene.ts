import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";

export type NewsroomSceneHandle = { dispose: () => void };

const REFERENCE_TEXTURE = "/manus-storage/commentator-newsroom-reference_451d2e70.png";

function material(scene: Scene, name: string, hex: string, emissive = 0) {
  const value = Color3.FromHexString(hex);
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = value;
  result.specularColor = Color3.Black();
  result.emissiveColor = value.scale(emissive);
  return result;
}

export function createNewsroomScene(canvas: HTMLCanvasElement, reducedMotion: boolean): NewsroomSceneHandle {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: false });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.018, 0.055, 0.065, 1);

  const camera = new ArcRotateCamera("newsroom-camera", -Math.PI / 2, 1.12, 13, new Vector3(0, 1.2, 0), scene);
  camera.lowerRadiusLimit = 11;
  camera.upperRadiusLimit = 15;
  camera.lowerBetaLimit = 0.85;
  camera.upperBetaLimit = 1.35;
  camera.wheelPrecision = 90;
  camera.attachControl(canvas, true);
  scene.activeCamera = camera;

  const sky = new HemisphericLight("room-sky", new Vector3(0, 1, 0), scene);
  sky.intensity = 0.72;
  sky.diffuse = Color3.FromHexString("#80ddd0");
  const lamp = new PointLight("desk-lamp", new Vector3(0, 4.2, 1.4), scene);
  lamp.intensity = 22;
  lamp.diffuse = Color3.FromHexString("#f4c66b");
  lamp.range = 16;

  const teal = material(scene, "teal", "#144a47");
  const brass = material(scene, "brass", "#c7984f", 0.05);
  const cobalt = material(scene, "cobalt", "#2360b4", 0.06);
  const robe = material(scene, "robe", "#183b57");
  const beard = material(scene, "beard", "#e7e7dc");
  const skin = material(scene, "skin", "#cfa07e");
  const parchment = material(scene, "parchment", "#ead7a5", 0.04);

  const floor = MeshBuilder.CreateGround("floor", { width: 16, height: 10 }, scene);
  floor.material = material(scene, "floor", "#092829");
  const backWall = MeshBuilder.CreatePlane("back-wall", { width: 11.4, height: 5.6 }, scene);
  backWall.position = new Vector3(0, 3.15, 3.5);
  backWall.rotation = new Vector3(0, Math.PI, 0);
  const wallMat = material(scene, "newsroom-reference", "#1a393a", 0.05);
  wallMat.diffuseTexture = new Texture(REFERENCE_TEXTURE, scene, true, false);
  wallMat.diffuseTexture.level = 0.48;
  wallMat.emissiveTexture = wallMat.diffuseTexture;
  wallMat.emissiveTexture.level = 0.1;
  backWall.material = wallMat;

  const deskBase = MeshBuilder.CreateBox("desk-base", { width: 5.4, height: 0.65, depth: 1.5 }, scene);
  deskBase.position = new Vector3(0, 1.1, 0.5);
  deskBase.material = teal;
  const deskTop = MeshBuilder.CreateBox("desk-top", { width: 5.7, height: 0.14, depth: 1.75 }, scene);
  deskTop.position = new Vector3(0, 1.48, 0.5);
  deskTop.material = brass;

  const chiefBody = MeshBuilder.CreateCylinder("chief-body", { height: 1.7, diameterTop: 0.95, diameterBottom: 1.25 }, scene);
  chiefBody.position = new Vector3(0, 2.2, 1.5);
  chiefBody.material = robe;
  const chiefHead = MeshBuilder.CreateSphere("chief-head", { diameter: 0.82, segments: 16 }, scene);
  chiefHead.position = new Vector3(0, 3.38, 1.45);
  chiefHead.material = skin;
  const chiefBeard = MeshBuilder.CreateCylinder("chief-beard", { height: 1.05, diameterTop: 0.72, diameterBottom: 0.23, tessellation: 16 }, scene);
  chiefBeard.position = new Vector3(0, 2.86, 1.02);
  chiefBeard.rotation.x = Math.PI;
  chiefBeard.material = beard;

  const messengers = [-1, 1].map((side, index) => {
    const body = MeshBuilder.CreateSphere(`kobold-${index}`, { diameter: 0.68, segments: 12 }, scene);
    body.material = cobalt;
    const paper = MeshBuilder.CreatePlane(`paper-${index}`, { width: 0.46, height: 0.32 }, scene);
    paper.material = parchment;
    paper.rotation.x = Math.PI / 2.7;
    return { side, body, paper, phase: index * Math.PI };
  });

  const routeStart = 5.3;
  const timeOrigin = performance.now();
  scene.onBeforeRenderObservable.add(() => {
    if (reducedMotion) {
      messengers.forEach(({ side, body, paper }) => {
        body.position = new Vector3(side * 2.3, 0.6, 0.8);
        paper.position = body.position.add(new Vector3(0, 0.62, -0.2));
      });
      return;
    }
    const elapsed = (performance.now() - timeOrigin) / 1000;
    messengers.forEach(({ side, body, paper, phase }) => {
      const travel = Math.sin(elapsed * 1.15 + phase);
      body.position.x = side * (2.1 + travel * 2.7);
      body.position.y = 0.62 + Math.abs(Math.sin(elapsed * 2.3 + phase)) * 0.15;
      body.position.z = 0.8 + Math.cos(elapsed * 1.15 + phase) * 0.45;
      paper.position = body.position.add(new Vector3(-side * 0.22, 0.55, -0.14));
      paper.rotation.z = Math.sin(elapsed * 3 + phase) * 0.15;
    });
    chiefBeard.rotation.z = Math.sin(elapsed * 0.8) * 0.025;
  });

  engine.runRenderLoop(() => scene.render());
  const resize = () => engine.resize();
  window.addEventListener("resize", resize);

  return {
    dispose: () => {
      window.removeEventListener("resize", resize);
      scene.dispose();
      engine.dispose();
    },
  };
}
