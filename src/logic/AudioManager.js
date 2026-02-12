import {
    Sound,
    Engine
} from "@babylonjs/core";

/**
 * ✅ AudioManager pour Babylon.js
 * Utilise l'API Sound standard
 */

const MUSIC_CONFIG = {
    ambient: { url: "/assets/musics/background_ambient.mp3", volume: 0.3 },
    boss: { url: "/assets/musics/background_boss.mp3", volume: 0.5 }
};

const SFX_URLS = {
    gunshot: "https://playground.babylonjs.com/sounds/gunshot.wav",
    violons: "https://playground.babylonjs.com/sounds/violons11.wav"
};

export class AudioManager {
    constructor(scene, engine) {
        console.log("🔥 AudioManager créé (Babylon.js 8.x API)");

        this.scene = scene;
        this.engine = engine;
        this.audioEngine = null;

        this.musics = new Map();
        this.sfx = new Map();

        this.currentMusicKey = null;
        this.isReady = false;
        this.isUnlocked = false;
    }

    /**
     * Initialise l'audio de manière NON-BLOQUANTE
     * Le jeu peut démarrer pendant que l'audio charge
     */
    async initAudio() {
        console.log("⏳ Initialisation Audio...");

        try {
            // ✅ Dans Babylon.js, l'audioEngine est lié à l'engine
            this.audioEngine = this.engine.getAudioEngine ? this.engine.getAudioEngine() : Engine.audioEngine;

            if (!this.audioEngine) {
                console.warn("⚠️ AudioEngine non disponible immédiatement");
            }

            // ✅ ÉTAPE 2 : Charger les musiques
            await this._loadStreamingMusics();

            // ✅ ÉTAPE 3 : Charger les SFX
            await this._loadSFX();

            this.isReady = true;
            console.log("✅ Audio Manager prêt !");

        } catch (error) {
            console.error("❌ Erreur lors de l'initialisation audio:", error);
        }
    }

    /**
     * Déverrouille l'audio (requis par les navigateurs)
     * Doit être appelé dans un gestionnaire d'événement utilisateur
     */
    async unlockAudio() {
        console.log("🔓 unlockAudio() appelé");

        if (this.isUnlocked) {
            console.log("   ✅ Déjà déverrouillé");
            return;
        }

        // On récupère l'engine au cas où il ne l'était pas au début
        if (!this.audioEngine) {
            this.audioEngine = this.engine.getAudioEngine ? this.engine.getAudioEngine() : Engine.audioEngine;
        }

        // Si toujours null, on essaie de forcer sa création via l'API statique
        if (!this.audioEngine && Engine.audioEngine) {
            this.audioEngine = Engine.audioEngine;
        }

        if (!this.audioEngine) {
            console.error("❌ Moteur audio non disponible");
            // Tentative de secours : Babylon peut avoir besoin qu'on accède à Engine.audioEngine pour l'instancier
            try {
                this.audioEngine = Engine.audioEngine;
                console.log("🔄 Tentative de récupération via Engine.audioEngine statique...");
            } catch(e) {
                console.error("❌ Échec critique de récupération de l'AudioEngine");
            }
        }

        if (!this.audioEngine) {
            console.error("❌ DEFINITIVEMENT INDISPONIBLE");
            return;
        }

        try {
            // ✅ Déverrouillage standard Babylon.js
            console.log("🔓 Tentative de déverrouillage de l'audioEngine...");
            this.audioEngine.unlock();
            
            this.isUnlocked = true;
            console.log("✅✅✅ AUDIO DÉVERROUILLÉ ✅✅✅");

        } catch (e) {
            console.error("❌ Erreur unlockAudio:", e);
        }
    }

    /**
     * Charge les musiques en mode STREAMING
     * Avantage : pas de chargement en mémoire, lecture instantanée
     */
    async _loadStreamingMusics() {
        console.log("📥 Chargement des musiques...");

        const promises = Object.entries(MUSIC_CONFIG).map(([key, config]) => {
            return new Promise((resolve) => {
                console.log(`   🎵 Chargement: ${key}`);
                const sound = new Sound(
                    key,
                    config.url,
                    this.scene,
                    () => {
                        console.log(`   ✅ Prêt: ${key}`);
                        resolve();
                    },
                    {
                        loop: true,
                        autoplay: false,
                        volume: config.volume,
                        streaming: true
                    }
                );
                this.musics.set(key, sound);
            });
        });

        await Promise.all(promises);
        console.log("✅ Toutes les musiques chargées");
    }

    /**
     * Charge les SFX en buffer
     */
    async _loadSFX() {
        console.log("📥 Chargement des SFX...");

        const sfxConfigs = [
            { name: "dash", url: SFX_URLS.gunshot, volume: 0.4, playbackRate: 2.0 },
            { name: "shoot", url: SFX_URLS.gunshot, volume: 0.2 },
            { name: "explosion", url: SFX_URLS.gunshot, volume: 0.5 },
            { name: "bonus", url: SFX_URLS.gunshot, volume: 0.6 },
            { name: "hit", url: SFX_URLS.violons, volume: 0.5, playbackRate: 4.0 }
        ];

        const promises = sfxConfigs.map(config => {
            return new Promise((resolve) => {
                const sound = new Sound(
                    config.name,
                    config.url,
                    this.scene,
                    () => resolve(),
                    {
                        volume: config.volume,
                        playbackRate: config.playbackRate || 1.0
                    }
                );
                this.sfx.set(config.name, sound);
            });
        });

        await Promise.all(promises);
        console.log("✅ Tous les SFX chargés");
    }

    /**
     * Joue une musique de fond
     */
    playMusic(key) {
        console.log(`🎵 playMusic("${key}")`);

        // On s'assure d'avoir l'audioEngine
        if (!this.audioEngine) {
            this.audioEngine = this.engine.getAudioEngine ? this.engine.getAudioEngine() : Engine.audioEngine;
        }

        // Si toujours null, on essaie de forcer sa création via l'API statique
        if (!this.audioEngine && Engine.audioEngine) {
            this.audioEngine = Engine.audioEngine;
        }

        // Vérification du verrouillage
        if (this.audioEngine && !this.isUnlocked) {
            if (this.audioEngine.unlocked) {
                this.isUnlocked = true;
            } else {
                console.error("❌ AUDIO NON DÉVERROUILLÉ");
                console.error("   Appelez unlockAudio() dans un event handler utilisateur");
                return;
            }
        }

        if (!this.isReady) {
            console.warn("⚠️ Audio pas encore prêt, tentative quand même...");
        }

        // Vérifie si déjà en lecture
        if (this.currentMusicKey === key) {
            const current = this.musics.get(key);
            if (current && current.isPlaying) {
                console.log("   ⚠️ Déjà en lecture");
                return;
            }
        }

        // Stop musique précédente
        if (this.currentMusicKey) {
            const prevMusic = this.musics.get(this.currentMusicKey);
            if (prevMusic && prevMusic.isPlaying) {
                console.log(`   ⏹️ Stop: ${this.currentMusicKey}`);
                prevMusic.stop();
            }
        }

        // Lance nouvelle musique
        const nextMusic = this.musics.get(key);
        if (!nextMusic) {
            console.error(`❌ Musique introuvable: ${key}`);
            console.log("   Disponibles:", Array.from(this.musics.keys()));
            return;
        }

        this.currentMusicKey = key;

        try {
            console.log(`   ▶️ play()...`);
            nextMusic.play();

            // Vérification après un court délai
            setTimeout(() => {
                if (nextMusic.isPlaying) {
                    console.log("   ✅✅✅ MUSIQUE EN LECTURE ✅✅✅");
                } else {
                    console.error("   ❌ La musique n'a pas démarré");
                    if (this.audioEngine && !this.audioEngine.unlocked) {
                        console.error("   Context is still LOCKED");
                    }
                }
            }, 100);

        } catch (e) {
            console.error(`❌ Erreur play():`, e);
        }
    }

    /**
     * Joue un effet sonore
     */
    playSound(key) {
        if (!this.isUnlocked) {
            console.warn(`⚠️ SFX "${key}" ignoré (audio locked)`);
            return;
        }

        const sound = this.sfx.get(key);
        if (sound) {
            console.log(`🔊 SFX: ${key}`);
            sound.play();
        } else {
            console.warn(`⚠️ SFX introuvable: ${key}`);
        }
    }

    /**
     * Arrête toutes les musiques
     */
    stopAll() {
        console.log("⏹️ Arrêt de tous les sons");

        if (this.currentMusicKey) {
            const music = this.musics.get(this.currentMusicKey);
            if (music && music.isPlaying) {
                music.stop();
            }
        }

        this.currentMusicKey = null;
    }
}