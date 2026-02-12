import { Sound, Engine } from "@babylonjs/core";

// Configuration centralisée des assets audio
const AUDIO_CONFIG = {
    music: {
        ambient: { url: "/assets/musics/background_ambient.mp3", volume: 0.3 },
        boss: { url: "/assets/musics/background_boss.mp3", volume: 0.5 }
    },
    sfx: {
        dash: { url: "https://playground.babylonjs.com/sounds/gunshot.wav", volume: 0.4, playbackRate: 2.0 },
        shoot: { url: "https://playground.babylonjs.com/sounds/gunshot.wav", volume: 0.2 },
        explosion: { url: "https://playground.babylonjs.com/sounds/gunshot.wav", volume: 0.5 },
        bonus: { url: "https://playground.babylonjs.com/sounds/gunshot.wav", volume: 0.6 },
        hit: { url: "https://playground.babylonjs.com/sounds/violons11.wav", volume: 0.5, playbackRate: 4.0 }
    }
};

/**
 * Gestionnaire Audio (AudioManager)
 * Gère le chargement, la lecture et le contrôle des musiques et effets sonores.
 */
export class AudioManager {
    /**
     * Crée une instance de AudioManager.
     * @param {Scene} scene - La scène Babylon.js.
     * @param {Engine} engine - Le moteur Babylon.js (pour l'AudioEngine).
     */
    constructor(scene, engine) {
        this.scene = scene;
        this.engine = engine; // Stockage explicite de l'engine si nécessaire, bien que Engine.audioEngine soit statique

        // Stockage des instances sonores
        this.musics = new Map();
        this.sfx = new Map();

        this.currentMusicKey = null;
        this.isAudioUnlocked = false;
    }

    /**
     * Getter pour récupérer l'AudioEngine de manière sécurisée.
     * @returns {AudioEngine} L'instance du moteur audio Babylon.js.
     */
    get audioEngine() {
        return Engine.audioEngine;
    }

    /**
     * Initialise et précharge les sons définis dans la configuration.
     * @async
     */
    async initAudio() {
        try {
            const musicPromises = Object.entries(AUDIO_CONFIG.music).map(([key, config]) =>
                this._loadSound(key, config, this.musics, { loop: true, autoplay: false, streaming: true })
            );

            const sfxPromises = Object.entries(AUDIO_CONFIG.sfx).map(([key, config]) =>
                this._loadSound(key, config, this.sfx, { loop: false, autoplay: false })
            );

            await Promise.all([...musicPromises, ...sfxPromises]);
            console.log("Gestionnaire Audio initialisé.");
        } catch (error) {
            console.error("Échec de l'initialisation audio :", error);
        }
    }

    /**
     * Méthode générique de chargement de son (Promisifiée).
     * @param {string} key - Le nom/clé du son.
     * @param {Object} config - Configuration (url, volume, playbackRate).
     * @param {Map} storageMap - La Map où stocker le son (musics ou sfx).
     * @param {Object} baseOptions - Options par défaut (loop, streaming, etc.).
     * @returns {Promise<void>} Une promesse résolue une fois le son chargé.
     * @private
     */
    _loadSound(key, config, storageMap, baseOptions) {
        return new Promise((resolve, reject) => {
            const options = {
                ...baseOptions,
                volume: config.volume || 1.0,
                playbackRate: config.playbackRate || 1.0
            };

            const sound = new Sound(key, config.url, this.scene,
                () => {
                    storageMap.set(key, sound);
                    resolve();
                },
                options
            );

            sound.onError = (err) => reject(`Échec du chargement du son '${key}': ${err}`);
        });
    }

    /**
     * Déverrouille l'AudioContext (Doit être appelé sur un clic/touche utilisateur).
     * Nécessaire pour les navigateurs modernes qui bloquent l'audio automatique.
     */
    unlockAudio() {
        if (this.isAudioUnlocked || !this.audioEngine) return;

        try {
            this.audioEngine.unlock();
            this.isAudioUnlocked = true;
            console.log("Moteur audio déverrouillé.");
        } catch (e) {
            console.warn("Impossible de déverrouiller le moteur audio :", e);
        }
    }

    /**
     * Joue une musique (gère la transition et l'arrêt de la précédente).
     * @param {string} key - La clé de la musique à jouer.
     */
    playMusic(key) {
        if (!this.audioEngine) return;

        // Si c'est déjà la même musique qui joue, on ne fait rien
        if (this.currentMusicKey === key && this.musics.get(key)?.isPlaying) return;

        // Arrêt de la musique précédente
        this.stopCurrentMusic();

        const music = this.musics.get(key);
        if (music) {
            this.currentMusicKey = key;
            music.play();
        } else {
            console.warn(`Musique '${key}' introuvable.`);
        }
    }

    /**
     * Joue un effet sonore (Fire & Forget).
     * @param {string} key - La clé de l'effet sonore.
     */
    playSound(key) {
        const sound = this.sfx.get(key);
        if (sound) {
            sound.play();
        } else {
            console.warn(`SFX '${key}' introuvable.`);
        }
    }

    /**
     * Arrête la musique en cours.
     */
    stopCurrentMusic() {
        if (this.currentMusicKey) {
            const music = this.musics.get(this.currentMusicKey);
            if (music) music.stop();
            this.currentMusicKey = null;
        }
    }

    /**
     * Arrête tous les sons (utile pour le Game Over ou changement de scène).
     */
    stopAll() {
        this.stopCurrentMusic();
        this.sfx.forEach(sound => sound.stop());
    }
}