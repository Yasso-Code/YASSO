import { Room } from "./Room.js";
import { Floor1 } from "./floors/Floor1.js";
import { Floor2 } from "./floors/Floor2.js";
import { Floor3 } from "./floors/Floor3.js";
import { Floor4 } from "./floors/Floor4.js";
import { Floor5 } from "./floors/Floor5.js";

export class FloorGenerator {

    static _roomOrders = {};

    /**
     * Génère (ou récupère) l'ordre mélangé des salles pour un étage.
     * Appelé automatiquement à la première salle de l'étage.
     */
    static getRoomOrder(floorNumber, totalRooms) {
        const key = `floor_${floorNumber}`;
        if (!this._roomOrders[key]) {

            // Floor 1 : R1 toujours en première position (salle tutorial)
            // R2 et R3 mélangées entre elles
            if (floorNumber === 1) {
                const rest = [1, 2].sort(() => Math.random() - 0.5);
                this._roomOrders[key] = [0, ...rest];
            }

                // Floors 3 & 4 : règle mini-boss
                // - La salle 2 (index 1) est toujours jouée en position 0 ou 1 (jamais en dernier)
            // - La dernière salle (position 2) est aléatoirement la salle 1 (index 0) ou salle 3 (index 2)
            else if (floorNumber === 3 || floorNumber === 4) {
                const miniBossIndex = Math.random() < 0.5 ? 0 : 2; // salle 1 ou salle 3
                const normalIndex   = miniBossIndex === 0 ? 2 : 0;  // l'autre
                // Les deux premières positions : salle normale + salle 2, mélangées
                const firstTwo = [normalIndex, 1].sort(() => Math.random() - 0.5);
                this._roomOrders[key] = [...firstTwo, miniBossIndex];
            } else {
                // Ordre purement aléatoire pour les autres étages
                const indices = Array.from({ length: totalRooms }, (_, i) => i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                this._roomOrders[key] = indices;
            }
        }
        return this._roomOrders[key];
    }

    /**
     * Réinitialise l'ordre d'un étage (appelé au début d'un nouveau run).
     */
    static resetFloorOrder(floorNumber) {
        delete this._roomOrders[`floor_${floorNumber}`];
    }

    /**
     * Réinitialise tous les ordres (nouveau run complet).
     */
    static resetAllOrders() {
        this._roomOrders = {};
    }

    /**
     * Route la génération vers le module d'étage approprié.
     * roomIndex est la position dans le run (0, 1, 2…),
     * l'ordre aléatoire mappe vers le vrai index de salle.
     */
    static generateRoom(floorNumber, roomIndex, roomType, aiData = null) {
        const floorModules = {
            1: Floor1,
            2: Floor2,
            3: Floor3,
            4: Floor4,
            5: Floor5
        };

        const module = floorModules[floorNumber] || Floor1;

        // Floor 5 (boss) = une seule salle, pas de mélange
        const totalRooms = floorNumber === 5 ? 1 : 3;
        const order = this.getRoomOrder(floorNumber, totalRooms);
        const mappedIndex = order[roomIndex] ?? roomIndex;

        const room = new Room({
            floorNumber,
            roomIndex,
            roomType,
            difficulty: this._calculateDifficulty(floorNumber, roomIndex)
        });

        module.generate(room, mappedIndex, null); // aiData réservé à l'IA Edition

        // Stocker le vrai index mappé pour que LevelManager puisse
        // récupérer les bons types d'ennemis (salle réelle, pas position run)
        room.mappedRoomIndex = mappedIndex;

        room.start();
        return room;
    }

    static _calculateDifficulty(floorNumber, roomIndexInRun) {
        // roomIndexInRun va de 0 à 2.
        // Résultat : Salle 1 (mult 1.0), Salle 2 (mult 1.3), Salle 3 (mult 1.6)
        return 1 + (roomIndexInRun * 0.3);
    }

    /**
     * Base de données de progression des ennemis
     */
    static getEnemyTypesForRoom(floorNumber, roomIndex) {
        const progression = {
            1: [
                ["Traqueur"],                      // R1 : intro — Traqueurs seulement
                ["Traqueur", "Sentinelle"],         // R2 : escalade — 1ère Sentinelle
                ["Traqueur", "Sentinelle"]          // R3 : pic F1 — pression croisée
            ],
            2: [
                ["Traqueur", "Drone"],
                ["Sentinelle", "Pulse"],
                ["Traqueur", "Sentinelle", "Pulse"]
            ],
            3: [
                ["Sentinelle", "Pulse"],
                ["Traqueur", "Pulse", "Drone"],
                ["Traqueur", "Sentinelle", "Drone"]
            ],
            4: [
                ["Sentinelle", "Pulse", "Drone"],
                ["Traqueur", "Sentinelle", "Pulse", "Tank"],
                ["Traqueur", "Sentinelle", "Pulse", "Parasite"]
            ],
            5: [["NEXUS"]]
        };
        return progression[floorNumber][roomIndex] || ["Traqueur"];
    }
}