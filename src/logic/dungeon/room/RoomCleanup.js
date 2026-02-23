
// Assure qu'aucun mesh ne reste en mémoire entre deux salles.

export class RoomCleanup {
    static clear(manager) {
        manager.portals.forEach(p => {
            if (p.metadata?.coreMesh) p.metadata.coreMesh.dispose();
            p.dispose();
        });
        if (manager.exitTrigger) manager.exitTrigger.dispose();
        manager.bonusCrates.forEach(c => c.dispose());
        manager.envNodes.forEach(n => n.dispose());

        manager.portals = [];
        manager.bonusCrates = [];
        manager.envNodes = [];
        manager.exitTrigger = null;
    }
}