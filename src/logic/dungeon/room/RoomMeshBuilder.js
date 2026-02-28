import {
    MeshBuilder, StandardMaterial, Color3, Vector3,
    PointLight, Animation
} from "@babylonjs/core";

/**
 * @class RoomMeshBuilder
 * @description Génère les visuels 3D des éléments de salle (escaliers, piliers, sols).
 * Séparé de la logique de collision pour garder Floor*.js propre.
 *
 * USAGE depuis un FloorX.js :
 *   RoomMeshBuilder.buildStair(scene, { x, zStart, zEnd, yStart, yEnd, width, color })
 *   RoomMeshBuilder.buildPlatformTile(scene, position, color)
 */
export class RoomMeshBuilder {

    // ─── PALETTE COULEURS FLOOR 4 ────────────────────────────────────────────
    static COLORS = {
        stairBase:    new Color3(0.05, 0.05, 0.12),   // Noir bleuté — structure
        stairEdge:    new Color3(0.0,  0.6,  1.0),    // Cyan néon — liseret de marche
        stairSide:    new Color3(0.02, 0.02, 0.08),   // Flanc sombre
        stairLight:   new Color3(0.0,  0.4,  0.8),    // Lumière ambiante
        pillar:       new Color3(0.0,  0.8,  0.6),    // Teal — piliers
        groundGlow:   new Color3(0.0,  0.3,  0.6),    // Sol lumineux
    };

    /**
     * ═══════════════════════════════════════════════════════
     *  ESCALIER VISUEL — marches individuelles avec liséret
     * ═══════════════════════════════════════════════════════
     * @param {Scene}  scene
     * @param {Object} opts
     *   x        {number}   — position X centrale (en world units, pas en tiles)
     *   zStart   {number}   — Z de départ (world)
     *   zEnd     {number}   — Z de fin (world)
     *   yStart   {number}   — Y de départ
     *   yEnd     {number}   — Y de fin
     *   width    {number}   — largeur en world units (ex: 2 * spacing)
     *   color    {Color3}   — couleur du liséret (optionnel)
     * @returns {Array} meshes créés (pour cleanup)
     */
    static buildStair(scene, opts) {
        const {
            x, zStart, zEnd, yStart, yEnd, width,
            color = this.COLORS.stairEdge
        } = opts;

        const meshes = [];
        const totalZ = zEnd - zStart;
        const totalY = yEnd - yStart;

        // Nombre de marches visuelles (1 par unité Z = trop fin, on groupe par 2)
        const stepCount = Math.floor(totalZ / 2);
        const stepDepth = totalZ / stepCount;
        const stepHeight = totalY / stepCount;

        for (let i = 0; i < stepCount; i++) {
            const z = zStart + i * stepDepth;
            const y = yStart + i * stepHeight;

            // ── Corps de la marche (dark) ──────────────────────────────────
            const body = MeshBuilder.CreateBox(`stair_body_${x}_${i}`, {
                width: width,
                height: stepHeight + 0.05, // léger overlap pour éviter les gaps
                depth: stepDepth
            }, scene);
            body.position = new Vector3(x, y + stepHeight * 0.5, z + stepDepth * 0.5);

            const bodyMat = new StandardMaterial(`stair_body_mat_${x}_${i}`, scene);
            bodyMat.emissiveColor = this.COLORS.stairBase;
            bodyMat.diffuseColor  = this.COLORS.stairBase;
            body.material = bodyMat;
            meshes.push(body);

            // ── Liséret avant de la marche (néon) ─────────────────────────
            const edge = MeshBuilder.CreateBox(`stair_edge_${x}_${i}`, {
                width: width,
                height: 0.06,
                depth: 0.08
            }, scene);
            edge.position = new Vector3(x, y + stepHeight, z + stepDepth);

            const edgeMat = new StandardMaterial(`stair_edge_mat_${x}_${i}`, scene);
            edgeMat.emissiveColor = color;
            edgeMat.alpha = 0.95;
            edge.material = edgeMat;
            meshes.push(edge);

            // ── Liséret latéral gauche (fin trait vertical) ───────────────
            if (i % 3 === 0) { // 1 sur 3 pour ne pas surcharger
                const sideL = MeshBuilder.CreateBox(`stair_sideL_${x}_${i}`, {
                    width: 0.05,
                    height: stepHeight * (i + 1),
                    depth: 0.05
                }, scene);
                sideL.position = new Vector3(
                    x - width * 0.5,
                    yStart + stepHeight * (i + 1) * 0.5,
                    z + stepDepth
                );
                const sideMat = new StandardMaterial(`stair_side_mat_${x}_${i}`, scene);
                sideMat.emissiveColor = color.scale(0.4);
                sideL.material = sideMat;
                meshes.push(sideL);

                // Droit
                const sideR = sideL.clone(`stair_sideR_${x}_${i}`);
                sideR.position.x = x + width * 0.5;
                meshes.push(sideR);
            }
        }

        // ── Lumière ponctuelle en bas de l'escalier ────────────────────────
        const light = new PointLight(`stair_light_${x}`, new Vector3(x, yStart + 1, zStart + totalZ * 0.3), scene);
        light.diffuse  = color;
        light.specular = color;
        light.intensity = 0.8;
        light.range = totalZ * 1.2;

        // Animation pulse douce
        const anim = new Animation(
            `stair_pulse_${x}`, "intensity", 30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        anim.setKeys([
            { frame: 0,  value: 0.6 },
            { frame: 30, value: 1.1 },
            { frame: 60, value: 0.6 }
        ]);
        light.animations = [anim];
        scene.beginAnimation(light, 0, 60, true);

        return meshes;
    }

    /**
     * ═══════════════════════════════════════════════════════
     *  PILIER DÉCORATIF — avec anneau néon et lumière
     * ═══════════════════════════════════════════════════════
     */
    static buildPillar(scene, position, height = 3, color = RoomMeshBuilder.COLORS.pillar) {
        const meshes = [];

        // Corps
        const body = MeshBuilder.CreateCylinder(`pillar_${position.x}_${position.z}`, {
            height,
            diameter: 0.4,
            tessellation: 6
        }, scene);
        body.position = new Vector3(position.x, position.y + height * 0.5, position.z);
        const mat = new StandardMaterial(`pillar_mat_${position.x}`, scene);
        mat.emissiveColor = this.COLORS.stairBase;
        body.material = mat;
        meshes.push(body);

        // Anneau sommital
        const ring = MeshBuilder.CreateTorus(`ring_${position.x}_${position.z}`, {
            diameter: 0.8,
            thickness: 0.08,
            tessellation: 16
        }, scene);
        ring.position = new Vector3(position.x, position.y + height, position.z);
        const ringMat = new StandardMaterial(`ring_mat_${position.x}`, scene);
        ringMat.emissiveColor = color;
        ring.material = ringMat;
        meshes.push(ring);

        // Lumière
        const light = new PointLight(`pillar_light_${position.x}`, ring.position.clone(), scene);
        light.diffuse    = color;
        light.intensity  = 0.5;
        light.range      = 6;

        return meshes;
    }

    /**
     * ═══════════════════════════════════════════════════════
     *  LIGNE DE PILIERS — le long d'un escalier
     * ═══════════════════════════════════════════════════════
     */
    static buildStairPillars(scene, opts) {
        const { x, zStart, zEnd, yStart, yEnd, spacing = 4, color } = opts;
        const meshes = [];
        const steps = Math.floor((zEnd - zStart) / spacing);

        for (let i = 0; i <= steps; i++) {
            const t  = i / steps;
            const z  = zStart + t * (zEnd - zStart);
            const y  = yStart + t * (yEnd - yStart);
            meshes.push(...this.buildPillar(scene, new Vector3(x, y, z), 1.5, color));
        }
        return meshes;
    }

    /**
     * ═══════════════════════════════════════════════════════
     *  TILE SOL LUMINEUX (optionnel, pour zones importantes)
     * ═══════════════════════════════════════════════════════
     */
    static buildGlowTile(scene, position, color = RoomMeshBuilder.COLORS.groundGlow) {
        const tile = MeshBuilder.CreateBox(`glow_${position.x}_${position.z}`, {
            width: 3.8, height: 0.05, depth: 3.8
        }, scene);
        tile.position = new Vector3(position.x, position.y + 0.02, position.z);
        const mat = new StandardMaterial(`glow_mat_${position.x}_${position.z}`, scene);
        mat.emissiveColor = color.scale(0.15);
        mat.alpha = 0.6;
        tile.material = mat;
        return tile;
    }
}