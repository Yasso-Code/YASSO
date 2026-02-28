import {
    MeshBuilder, StandardMaterial, Color3, Vector3,
    PointLight, Animation, MeshBuilder as MB
} from "@babylonjs/core";

/**
 * @class RoomDecorations
 * @description Centralise tous les éléments visuels complexes et leurs animations.
 *
 * Types supportés :
 *   pillar         — cylindre avec pulse (existant)
 *   holoBarrier    — barrière holographique wireframe (existant)
 *   centerPlatform — plateforme centrale (existant)
 *   stair          — escalier avec marches néon + lumière pulsante (nouveau)
 *   stairPillars   — ligne de piliers le long d'un escalier (nouveau)
 *   glowTile       — tile au sol avec lueur subtile (nouveau)
 */
export class RoomDecorations {

    static create(manager, deco, config) {
        let mesh;
        switch (deco.type) {
            case 'pillar':          mesh = this._createPillar(manager, deco, config);         break;
            case 'holoBarrier':     mesh = this._createHoloBarrier(manager, deco, config);    break;
            case 'centerPlatform':  mesh = this._createCenterPlatform(manager, deco, config); break;
            case 'stair':           mesh = this._createStair(manager, deco, config);          break;
            case 'stairPillars':    mesh = this._createStairPillars(manager, deco, config);   break;
            case 'glowTile':        mesh = this._createGlowTile(manager, deco, config);       break;
        }
        if (mesh) {
            // Supporte retour tableau (stair, stairPillars) ou mesh unique
            if (Array.isArray(mesh)) {
                mesh.forEach(m => manager.envNodes.push(m));
            } else {
                manager.envNodes.push(mesh);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  EXISTANTS
    // ═══════════════════════════════════════════════════════════════

    static _createPillar(manager, deco, config) {
        // Supporte ancien format (deco.position) ET nouveau format (deco.opts.position)
        const pos    = (deco.opts && deco.opts.position) ? deco.opts.position : deco.position;
        const height = (deco.opts && deco.opts.height)   ? deco.opts.height   : (deco.height || 3);
        const color  = (deco.opts && deco.opts.color)    ? deco.opts.color    : (deco.color || config.color);

        if (!pos) { console.warn("RoomDecorations._createPillar: position manquante", deco); return null; }

        const mesh = MeshBuilder.CreateCylinder(`pillar_${pos.x}_${pos.z}`, {
            diameter: 0.5,
            height,
            tessellation: 6
        }, manager.scene);
        mesh.position = pos.clone();
        const mat = new StandardMaterial(`pillarMat_${pos.x}`, manager.scene);
        mat.emissiveColor = deco.highlight ? color.scale(1.5) : color.scale(0.5);
        mat.alpha = 0.6;
        mesh.material = mat;

        // Anneau sommital néon
        const ring = MeshBuilder.CreateTorus(`ring_${pos.x}_${pos.z}`, {
            diameter: 0.9, thickness: 0.07, tessellation: 16
        }, manager.scene);
        ring.position = new Vector3(pos.x, pos.y + height, pos.z);
        const ringMat = new StandardMaterial(`ringMat_${pos.x}`, manager.scene);
        ringMat.emissiveColor = color;
        ring.material = ringMat;
        manager.envNodes.push(ring);

        if (deco.highlight) {
            this._addPulse(manager.scene, mesh);
            this._addPulse(manager.scene, ring);
        }

        // Lumière ponctuelle au sommet
        const light = new PointLight(`pLight_${pos.x}_${pos.z}`, ring.position.clone(), manager.scene);
        light.diffuse   = color;
        light.intensity = 0.5;
        light.range     = 5;

        return mesh;
    }

    static _createHoloBarrier(manager, deco, config) {
        const width = deco.orientation === 'vertical' ? 0.2 : 3;
        const depth = deco.orientation === 'vertical' ? 3   : 0.2;
        const mesh  = MeshBuilder.CreateBox("barrier", { width, height: 2, depth }, manager.scene);
        mesh.position = deco.position.clone();
        const mat = new StandardMaterial("barrierMat", manager.scene);
        mat.emissiveColor = config.color;
        mat.alpha     = 0.2;
        mat.wireframe = true;
        mesh.material = mat;
        this._addPulse(manager.scene, mesh);
        return mesh;
    }

    static _createCenterPlatform(manager, deco, config) {
        const mesh = MeshBuilder.CreateBox("centerPlatform", {
            width: deco.width || 4,
            height: 0.3,
            depth: deco.depth || 4
        }, manager.scene);
        mesh.position = deco.position.clone();
        const mat = new StandardMaterial("cpMat", manager.scene);
        mat.emissiveColor = config.color.scale(0.4);
        mat.alpha = 0.8;
        mesh.material = mat;
        return mesh;
    }

    // ═══════════════════════════════════════════════════════════════
    //  NOUVEAUX — ESCALIERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Escalier visuel avec marches néon individuelles + lumière pulsante
     *
     * deco.opts = {
     *   x        {number}  — position X centrale (world units)
     *   zStart   {number}  — Z de départ
     *   zEnd     {number}  — Z de fin
     *   yStart   {number}  — Y de départ
     *   yEnd     {number}  — Y de fin
     *   width    {number}  — largeur totale en world units
     *   color    {Color3}  — couleur du liséret (optionnel, fallback config.color)
     * }
     */
    static _createStair(manager, deco, config) {
        const scene = manager.scene;
        const { x, zStart, zEnd, yStart, yEnd, width } = deco.opts;
        const color  = deco.opts.color || config.color;
        const meshes = [];

        const totalZ    = zEnd - zStart;
        const totalY    = yEnd - yStart;
        const stepCount = Math.max(1, Math.floor(totalZ / 2)); // 1 marche visuelle / 2u
        const stepDepth  = totalZ / stepCount;
        const stepHeight = totalY / stepCount;

        // Couleur de base sombre (structure)
        const BASE = new Color3(0.04, 0.04, 0.10);

        for (let i = 0; i < stepCount; i++) {
            const z = zStart + i * stepDepth;
            const y = yStart + i * stepHeight;

            // Corps de la marche
            const body = MeshBuilder.CreateBox(`sc_body_${x}_${i}`, {
                width,
                height: stepHeight + 0.05,
                depth:  stepDepth
            }, scene);
            body.position = new Vector3(x, y + stepHeight * 0.5, z + stepDepth * 0.5);
            // isPickable=false : le rayon de sol (Player._isValidMove) ignore ce mesh
            // Seules les plateformes nommées "p" sont valides pour la collision sol
            body.isPickable = false;
            const bodyMat = new StandardMaterial(`sc_bmat_${x}_${i}`, scene);
            bodyMat.emissiveColor = BASE;
            bodyMat.diffuseColor  = BASE;
            body.material = bodyMat;
            meshes.push(body);

            // Liséret avant néon (bord de la marche)
            const edge = MeshBuilder.CreateBox(`sc_edge_${x}_${i}`, {
                width,
                height: 0.06,
                depth:  0.07
            }, scene);
            edge.position = new Vector3(x, y + stepHeight, z + stepDepth);
            edge.isPickable = false;
            const edgeMat = new StandardMaterial(`sc_emat_${x}_${i}`, scene);
            edgeMat.emissiveColor = color;
            edgeMat.alpha = 0.95;
            edge.material = edgeMat;
            meshes.push(edge);

            // Traits verticaux latéraux (1 sur 3) — donnent la profondeur
            if (i % 3 === 0) {
                [-0.5, 0.5].forEach(side => {
                    const rib = MeshBuilder.CreateBox(`sc_rib_${x}_${i}_${side}`, {
                        width: 0.05,
                        height: stepHeight * (i + 1),
                        depth:  0.05
                    }, scene);
                    rib.position = new Vector3(
                        x + side * width,
                        yStart + stepHeight * (i + 1) * 0.5,
                        z + stepDepth
                    );
                    rib.isPickable = false;
                    const ribMat = new StandardMaterial(`sc_rmat_${x}_${i}_${side}`, scene);
                    ribMat.emissiveColor = color.scale(0.35);
                    rib.material = ribMat;
                    meshes.push(rib);
                });
            }
        }

        // Lumière pulsante en bas de l'escalier
        const light = new PointLight(`sc_light_${x}`, new Vector3(x, yStart + 1, zStart + totalZ * 0.3), scene);
        light.diffuse   = color;
        light.specular  = color;
        light.intensity = 0.8;
        light.range     = totalZ * 1.2;
        const anim = new Animation(`sc_pulse_${x}`, "intensity", 30,
            Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        anim.setKeys([
            { frame:  0, value: 0.5 },
            { frame: 30, value: 1.2 },
            { frame: 60, value: 0.5 }
        ]);
        light.animations = [anim];
        scene.beginAnimation(light, 0, 60, true);

        return meshes;
    }

    /**
     * Ligne de piliers décoratifs le long d'un escalier
     *
     * deco.opts = {
     *   x        — X (world)
     *   zStart, zEnd, yStart, yEnd
     *   spacing  — espacement entre piliers (world units, défaut 8)
     *   color    — Color3
     * }
     */
    static _createStairPillars(manager, deco, config) {
        const scene = manager.scene;
        const { x, zStart, zEnd, yStart, yEnd } = deco.opts;
        const spacing = deco.opts.spacing || 8;
        const color   = deco.opts.color   || config.color;
        const meshes  = [];

        const steps = Math.floor((zEnd - zStart) / spacing);
        for (let i = 0; i <= steps; i++) {
            const t = i / Math.max(steps, 1);
            const z = zStart + t * (zEnd - zStart);
            const y = yStart + t * (yEnd - yStart);

            // Corps
            const body = MeshBuilder.CreateCylinder(`sp_body_${x}_${i}`, {
                height: 1.8, diameter: 0.3, tessellation: 6
            }, scene);
            body.position = new Vector3(x, y + 0.9, z);
            const bMat = new StandardMaterial(`sp_bmat_${x}_${i}`, scene);
            bMat.emissiveColor = new Color3(0.04, 0.04, 0.10);
            body.material = bMat;
            meshes.push(body);

            // Anneau sommital
            const ring = MeshBuilder.CreateTorus(`sp_ring_${x}_${i}`, {
                diameter: 0.6, thickness: 0.06, tessellation: 12
            }, scene);
            ring.position = new Vector3(x, y + 1.8, z);
            const rMat = new StandardMaterial(`sp_rmat_${x}_${i}`, scene);
            rMat.emissiveColor = color;
            ring.material = rMat;
            meshes.push(ring);

            // Mini-lumière
            const light = new PointLight(`sp_light_${x}_${i}`, ring.position.clone(), scene);
            light.diffuse   = color;
            light.intensity = 0.3;
            light.range     = 4;
        }

        return meshes;
    }

    // ═══════════════════════════════════════════════════════════════
    //  NOUVEAU — GLOW TILE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tile au sol avec lueur subtile (marque les zones importantes)
     *
     * deco.opts = { position: Vector3, color: Color3 }
     */
    static _createGlowTile(manager, deco, config) {
        const pos   = deco.opts.position;
        const color = deco.opts.color || config.color;

        const tile = MeshBuilder.CreateBox(`gt_${pos.x}_${pos.z}`, {
            width: 3.8, height: 0.05, depth: 3.8
        }, manager.scene);
        tile.position = new Vector3(pos.x, pos.y + 0.02, pos.z);
        const mat = new StandardMaterial(`gt_mat_${pos.x}_${pos.z}`, manager.scene);
        mat.emissiveColor = color.scale(0.15);
        mat.alpha = 0.55;
        tile.material = mat;
        return tile;
    }

    // ═══════════════════════════════════════════════════════════════
    //  UTILITAIRE COMMUN
    // ═══════════════════════════════════════════════════════════════

    static _addPulse(scene, mesh) {
        const anim = new Animation(
            "pulse", "material.alpha", 30,
            Animation.ANIMATIONTYPE_FLOAT,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );
        anim.setKeys([
            { frame:  0, value: 0.3 },
            { frame: 30, value: 0.7 },
            { frame: 60, value: 0.3 }
        ]);
        mesh.animations.push(anim);
        scene.beginAnimation(mesh, 0, 60, true);
    }
}