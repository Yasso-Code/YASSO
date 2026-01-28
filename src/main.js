import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder } from "@babylonjs/core";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas, true);

const createScene = () => {
    const scene = new Scene(engine);

    // Caméra : On peut tourner autour du centre avec la souris
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2.5, 5, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // Lumière
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Notre premier objet : Une sphère (le futur "cerveau" de ton IA ?)
    const sphere = MeshBuilder.CreateSphere("sphere", { diameter: 1 }, scene);
    sphere.position.y = 1;

    // Un sol
    MeshBuilder.CreateGround("ground", { width: 6, height: 6 }, scene);

    return scene;
};

const scene = createScene();

// La boucle de rendu : s'exécute ~60 fois par seconde
engine.runRenderLoop(() => {
    scene.render();
});

// Gérer le redimensionnement de la fenêtre (très important pour le web)
window.addEventListener("resize", () => {
    engine.resize();
});