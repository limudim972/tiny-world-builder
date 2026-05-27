(() => {
  'use strict';

  const VIEW_KEYS = ['down', 'up', 'right', 'left'];
  const DIRECTIONAL_VIEW_KEYS = ['down', 'up', 'right', 'left'];
  const TAU = Math.PI * 2;
  const VIEW_SWITCH_HYSTERESIS = 0.08;
  const HOUSE_DOOR_HEIGHT = 0.48;

  const DEFAULT_CONFIG = {
    count: 200,
    size: 52,
    sizeVar: 0.18,
    hues: 8,
    hairColors: 5,
    shadow: 0.40,

    slices: 10,
    bob: 2.4,
    sway: 1.4,
    headSway: 0.45,
    leg: 3.2,
    squash: 0.060,
    lean: 0.07,
    hipLine: 0.62,
    cadence: 1.7,
    cadenceVar: 0.25,

    speed: 45,
    turn: 2.0,
    speedVar: 0.25,

    mode: 'wander',
    ground: 'plaza',
    ysort: true,
    pixelate: false,
    debug: false,

    isolateBase: -1,
  };

  const DEFAULT_WORLD_CONFIG = {
    doorHeight: HOUSE_DOOR_HEIGHT,
    personDoorRatio: 0.86,
    overheadAngle: 0.68,
    topBodyScale: 0.24,
    topHeadShare: 0.38,
    zoneRadius: 0.16,
  };

  const DEFAULT_CHARACTER_SETS = [
    {
      name: 'townie',
      down: 'sprites_sp1/characters/characters_08.png',
      up: 'sprites_sp1/characters/characters_04.png',
      right: 'sprites_sp1/characters/characters_22.png',
      left: 'sprites_sp1/characters/characters_13.png',
      aspect: 122 / 190,
    },
    {
      name: 'little-girl',
      down: 'charachters/little-girl/little-girl-down.png',
      up: 'charachters/little-girl/little-girl-up.png',
      right: 'charachters/little-girl/little-girl-right.png',
      left: 'charachters/little-girl/little-girl-left.png',
      aspect: 291 / 477,
    },
    {
      name: 'dad',
      down: 'charachters/man-dad/man-dad-down.png',
      up: 'charachters/man-dad/man-dad-up.png',
      right: 'charachters/man-dad/man-dad-right.png',
      left: 'charachters/man-dad/man-dad-left.png',
      aspect: 279 / 550,
    },
    {
      name: 'grandfather',
      down: 'charachters/man-grandfather/man-grandfather-down.png',
      up: 'charachters/man-grandfather/man-grandfather-up.png',
      right: 'charachters/man-grandfather/man-grandfather-right.png',
      left: 'charachters/man-grandfather/man-grandfather-left.png',
      aspect: 279 / 550,
    },
    {
      name: 'grandmother',
      down: 'charachters/woman-grandmother/woman-grandmother-down.png',
      up: 'charachters/woman-grandmother/woman-grandmother-up.png',
      right: 'charachters/woman-grandmother/woman-grandmother-right.png',
      left: 'charachters/woman-grandmother/woman-grandmother-left.png',
      aspect: 279 / 550,
    },
  ];

  const SHIRT_PALETTE = [
    { hue: 195, sat: null },
    { hue:   0, sat: null },
    { hue:  18, sat: null },
    { hue:  45, sat: null },
    { hue: 105, sat: null },
    { hue: 145, sat: null },
    { hue: 260, sat: null },
    { hue: 320, sat: null },
    { hue:  75, sat: null },
    { hue: 220, sat: null },
    { hue: 300, sat: null },
    { hue:  10, sat: null },
    { hue:  90, sat: null },
    { hue: 170, sat: null },
    { hue: 240, sat: null },
    { hue: 350, sat: null },
  ];

  const IMAGE_CACHE = new Map();

  const HAIR_PALETTE = [
    { name: 'original', hue: null, sat: null, valMul: 1.00 },
    { name: 'dark',     hue: 28,   sat: 0.35, valMul: 0.62 },
    { name: 'blond',    hue: 44,   sat: 0.56, valMul: 1.18 },
    { name: 'red',      hue: 12,   sat: 0.68, valMul: 0.98 },
    { name: 'black',    hue: 220,  sat: 0.20, valMul: 0.50 },
    { name: 'silver',   hue: 215,  sat: 0.10, valMul: 1.18 },
    { name: 'auburn',   hue: 20,   sat: 0.62, valMul: 0.82 },
    { name: 'chestnut', hue: 34,   sat: 0.48, valMul: 0.88 },
  ];

  function cleanBasePath(path) {
    const value = String(path || 'crowd/');
    return value.endsWith('/') ? value : `${value}/`;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function mergeConfig(base, next) {
    return Object.assign({}, base, next || {});
  }

  function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const d = mx - mn;
    let h = 0;
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = ((b - r) / d) + 2;
      else h = ((r - g) / d) + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = mx === 0 ? 0 : d / mx;
    const v = mx;
    return [h, s, v];
  }

  function hsvToRgb(h, s, v) {
    h = ((h % 360) + 360) % 360;
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (h < 60)      { r = c; g = x; b = 0; }
    else if (h < 120){ r = x; g = c; b = 0; }
    else if (h < 180){ r = 0; g = c; b = x; }
    else if (h < 240){ r = 0; g = x; b = c; }
    else if (h < 300){ r = x; g = 0; b = c; }
    else             { r = c; g = 0; b = x; }
    return [(r + m) * 255 | 0, (g + m) * 255 | 0, (b + m) * 255 | 0];
  }

  function bakeOne(baseImg, shirtHue, hairTone) {
    const srcW = baseImg.naturalWidth, srcH = baseImg.naturalHeight;
    const bakeH = Math.min(srcH, 220);
    const bakeW = Math.max(1, Math.round(srcW * (bakeH / srcH)));
    const w = bakeW, h = bakeH;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(baseImg, 0, 0, w, h);
    const recolorShirt = Math.abs(shirtHue - 195) >= 0.5;
    const recolorHair  = !!(hairTone && hairTone.hue !== null);
    if (!recolorShirt && !recolorHair) return c;

    const img = g.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 8) continue;
      const r = d[i], gr = d[i + 1], bl = d[i + 2];
      const [hh, ss, vv] = rgbToHsv(r, gr, bl);
      const y = ((i / 4) / w) | 0;
      if (recolorShirt && hh >= 170 && hh <= 220 && ss >= 0.30 && vv >= 0.32) {
        const [nr, ng, nb] = hsvToRgb(shirtHue, ss, vv);
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
        continue;
      }

      const looksLikeHair =
        recolorHair &&
        y < h * 0.62 &&
        hh >= 8 && hh <= 54 &&
        ss >= 0.24 &&
        vv >= 0.16 && vv <= 0.70 &&
        !(vv > 0.52 && ss < 0.46) &&
        !(y > h * 0.46 && vv > 0.48 && hh < 22);

      if (looksLikeHair) {
        const ns = hairTone.sat === null ? ss : Math.max(0, Math.min(1, hairTone.sat));
        const nv = Math.max(0, Math.min(1, vv * hairTone.valMul));
        const [nr, ng, nb] = hsvToRgb(hairTone.hue, ns, nv);
        d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  function bakeTopCanvas(source, worldConfig) {
    const width = source.width || 64;
    const height = source.height || 96;
    const headHeight = Math.max(1, Math.round(height * worldConfig.topHeadShare));
    const bodyHeight = Math.max(1, height - headHeight);
    const collapsedBodyHeight = Math.max(1, Math.round(bodyHeight * worldConfig.topBodyScale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = headHeight + collapsedBodyHeight;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, width, headHeight, 0, 0, width, headHeight);
    ctx.drawImage(source, 0, headHeight, width, bodyHeight, 0, headHeight, width, collapsedBodyHeight);
    return canvas;
  }

  function makeFallbackCanvas(color, label) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(32, 20, 12, 0, TAU);
    ctx.fill();
    ctx.fillRect(22, 34, 20, 42);
    ctx.fillStyle = 'rgba(42, 39, 34, 0.55)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label.slice(0, 1).toUpperCase(), 32, 91);
    return canvas;
  }

  function makeCanvasTexture(THREE, canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }

  function pickViewFromHeading(heading, currentView) {
    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);
    const verticalBias = 0.85;
    const verticalStrength   = Math.abs(sinH) - Math.abs(cosH) * verticalBias;
    const horizontalStrength = Math.abs(cosH) - Math.abs(sinH) * verticalBias;

    let candidate;
    if (verticalStrength > horizontalStrength) {
      candidate = sinH > 0 ? 'down' : 'up';
    } else {
      candidate = cosH >= 0 ? 'right' : 'left';
    }

    if (!currentView || currentView === 'top') return candidate;
    if (candidate === currentView) return currentView;

    const isCurrentVertical   = (currentView === 'down' || currentView === 'up');
    const isCandidateVertical = (candidate    === 'down' || candidate    === 'up');
    if (isCurrentVertical === isCandidateVertical) return candidate;
    const dominant   = Math.max(verticalStrength, horizontalStrength);
    const subordinate = Math.min(verticalStrength, horizontalStrength);
    if (dominant - subordinate > VIEW_SWITCH_HYSTERESIS) return candidate;
    return currentView;
  }

  function pickCameraRelativeView(person, camera, position) {
    const pos = position || person.sprite.position;
    const dx = camera.position.x - pos.x;
    const dy = camera.position.y - pos.y;
    const dz = camera.position.z - pos.z;
    const horizontalDist = Math.hypot(dx, dz);
    if (horizontalDist + Math.abs(dy) < 0.0001) return person.view || 'down';
    const overheadAmount = Math.atan2(Math.max(0, dy), Math.max(0.0001, horizontalDist)) / (Math.PI * 0.5);
    if (overheadAmount >= person.worldConfig.overheadAngle) return 'top';
    const cameraAngle = Math.atan2(dz, dx);
    const side = Math.sin(cameraAngle - person.heading);
    const front = Math.cos(cameraAngle - person.heading);
    const previous = person.view === 'top' ? null : person.view;
    const margin = previous ? VIEW_SWITCH_HYSTERESIS : 0;
    if (Math.abs(front) >= Math.abs(side) + margin) return front >= 0 ? 'down' : 'up';
    if (Math.abs(side) >= Math.abs(front) + margin) return side >= 0 ? 'right' : 'left';
    return previous || (front >= 0 ? 'down' : 'up');
  }

  function drawAnimatedPerson(ctx, p, source, config, worldConfig) {
    const viewKey = p.view || 'down';
    const srcW = source.width;
    const srcH = source.height;
    const sizeY = config.size * p.sizeMul;
    const sizeX = sizeY * (srcW / srcH);
    const canvasPad = Math.ceil(Math.max(config.bob, config.sway, config.leg, config.size * config.lean) + 8);

    ctx.canvas.width = Math.ceil(sizeX + canvasPad * 2);
    ctx.canvas.height = Math.ceil(sizeY + canvasPad * 2 + config.shadow * 8);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const isVertical = (viewKey === 'down' || viewKey === 'up' || viewKey === 'top');
    const cosHmotion = Math.cos(p.heading);
    const leanDir = isVertical
      ? 0
      : (Math.abs(cosHmotion) < 0.05 ? 0 : Math.sign(cosHmotion));
    const horizDamp = isVertical ? 0.25 : 1.0;
    const ph  = p.phase;
    const s1  = Math.sin(ph);
    const c1  = Math.cos(ph);
    const s2  = Math.sin(ph * 2);
    const bobY = viewKey === 'top' ? 0 : -Math.abs(s2) * config.bob;
    const squashY = viewKey === 'top' ? 1 : 1 - Math.max(0, -s2) * config.squash;
    const movingMag = Math.min(1, (config.speed * p.speedMul) / 30);
    const leanX = config.lean * movingMag * leanDir;
    const N = Math.max(2, config.slices | 0);
    const hipLine = clamp(config.hipLine, 0.05, 0.98);

    ctx.save();
    ctx.translate(ctx.canvas.width * 0.5, canvasPad + sizeY * 0.5 + bobY);
    if (Math.abs(1 - squashY) > 0.0005) {
      ctx.translate(0, sizeY * 0.5);
      ctx.scale(1, squashY);
      ctx.translate(0, -sizeY * 0.5);
    }

    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = !config.pixelate;
    ctx.imageSmoothingQuality = 'low';

    if (config.shadow > 0.001 && viewKey !== 'top') {
      ctx.fillStyle = `rgba(0, 0, 0, ${config.shadow * 0.55})`;
      ctx.beginPath();
      ctx.ellipse(0, sizeY * 0.46, sizeX * 0.36, sizeY * 0.08, 0, 0, TAU);
      ctx.fill();
    }

    const swayAmp     = config.sway     * horizDamp;
    const headSwayAmp = config.headSway * horizDamp;
    const legAmp      = config.leg      * horizDamp;
    const sliceH = sizeY / N;
    const srcSliceH = srcH / N;
    const overlap = 0.5;

    for (let i = 0; i < N; i++) {
      const u = i / (N - 1);
      let dx;
      if (u <= hipLine) {
        const torsoBlend = 1 - (u / hipLine);
        const torso = s1 * swayAmp * (0.5 + 0.5 * torsoBlend);
        const headT = clamp((hipLine * 0.5 - u) / (hipLine * 0.5 + 0.0001), 0, 1);
        const head  = -s1 * headSwayAmp * headT;
        dx = torso + head;
      } else {
        const legFrac = (u - hipLine) / (1 - hipLine);
        dx = s1 * legAmp * legFrac;
        dx += c1 * swayAmp * 0.10 * legFrac;
      }
      dx += leanX * (0.5 - u) * sizeY;

      const sy = i * srcSliceH;
      const dy = -sizeY * 0.5 + i * sliceH;
      ctx.drawImage(
        source,
        0,
        Math.max(0, sy - overlap),
        srcW,
        Math.min(srcH - Math.max(0, sy - overlap), srcSliceH + overlap * 2),
        -sizeX * 0.5 + dx,
        dy - overlap,
        sizeX,
        sliceH + overlap * 2
      );
    }

    if (config.debug) {
      ctx.strokeStyle = 'rgba(255, 220, 120, 0.65)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(0, sizeY * 0.46, sizeX * 0.36, sizeY * 0.08, 0, 0, TAU);
      ctx.stroke();
    }

    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.restore();
    return {
      aspect: ctx.canvas.width / ctx.canvas.height,
      heightScale: viewKey === 'top' ? (source.height / Math.max(1, p.baseSourceHeight)) * worldConfig.topBodyScale * 1.8 : 1,
    };
  }

  class TinyCrowdLayer {
    constructor(opts = {}) {
      if (!opts.THREE) throw new Error('TinyCrowdLayer requires THREE');
      if (!opts.root) throw new Error('TinyCrowdLayer requires a root group');
      this.THREE = opts.THREE;
      this.root = opts.root;
      this.camera = opts.camera || null;
      this.basePath = cleanBasePath(opts.textureBasePath || 'crowd/');
      this.tileToWorld = typeof opts.tileToWorld === 'function' ? opts.tileToWorld : null;
      this.getTerrainHeight = typeof opts.getTerrainHeight === 'function' ? opts.getTerrainHeight : (() => 0);
      this.moveConstraint = typeof opts.moveConstraint === 'function' ? opts.moveConstraint : null;
      this.onRouteComplete = typeof opts.onRouteComplete === 'function' ? opts.onRouteComplete : null;
      this.scale = opts.scale || 1;
      this.config = mergeConfig(DEFAULT_CONFIG, opts.config);
      this.worldConfig = mergeConfig(DEFAULT_WORLD_CONFIG, opts.worldConfig);
      this.group = new this.THREE.Group();
      this.group.name = opts.name || 'tiny-crowd-layer';
      this.root.add(this.group);
      this.characters = new Map();
      this.people = new Map();
      this.loaded = false;
      this.zoneFillMaterial = new this.THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.18, depthTest: false, depthWrite: false, side: this.THREE.DoubleSide });
      this.zoneRingMaterial = new this.THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false, side: this.THREE.DoubleSide });
      this.arrowMaterial = new this.THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, side: this.THREE.DoubleSide });
    }

    configure(config = {}, worldConfig = {}) {
      this.config = mergeConfig(this.config, config);
      this.worldConfig = mergeConfig(this.worldConfig, worldConfig);
      this.people.forEach(person => {
        person.config = this.config;
        person.worldConfig = this.worldConfig;
        person.radius = this.worldConfig.zoneRadius;
        this.placePerson(person);
      });
    }

    setMoveConstraint(fn) {
      this.moveConstraint = typeof fn === 'function' ? fn : null;
    }

    setRouteCompleteHandler(fn) {
      this.onRouteComplete = typeof fn === 'function' ? fn : null;
    }

    load(opts = {}) {
      if (opts.config || opts.worldConfig) this.configure(opts.config, opts.worldConfig);
      const sets = opts.characters || DEFAULT_CHARACTER_SETS;
      const jobs = sets.map((set, idx) => this.loadCharacterSet(set, idx));
      return Promise.all(jobs).then(() => {
        this.loaded = true;
        this.people.forEach(person => this.drawPersonTexture(person, true));
        return this;
      });
    }

    loadCharacterSet(set, idx) {
      const character = {
        name: set.name,
        idx,
        aspect: set.aspect || 0.62,
        source: {},
        variants: {},
      };
      this.characters.set(character.name, character);
      return Promise.all(DIRECTIONAL_VIEW_KEYS.map(view => this.loadImage(`${this.basePath}${set[view]}`)
        .then(img => { character.source[view] = img; })
        .catch(() => { character.source[view] = makeFallbackCanvas('#3a72c8', character.name); })))
        .then(() => this.rebakeCharacter(character));
    }

    loadImage(url) {
      if (IMAGE_CACHE.has(url)) return IMAGE_CACHE.get(url);
      const promise = new Promise((resolve, reject) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
      IMAGE_CACHE.set(url, promise);
      return promise;
    }

    rebakeCharacter(character) {
      const shirtCount = Math.min(this.config.hues, SHIRT_PALETTE.length);
      const hairCount  = Math.min(this.config.hairColors, HAIR_PALETTE.length);
      for (const view of DIRECTIONAL_VIEW_KEYS) {
        const src = character.source[view];
        const row = [];
        if (src) {
          for (let shirt = 0; shirt < shirtCount; shirt++) {
            for (let hair = 0; hair < hairCount; hair++) {
              row.push(bakeOne(src, SHIRT_PALETTE[shirt].hue, HAIR_PALETTE[hair]));
            }
          }
        }
        character.variants[view] = row;
      }
      const topBase = character.variants.up.length ? character.variants.up : character.variants.down;
      character.variants.top = topBase.map(canvas => bakeTopCanvas(canvas, this.worldConfig));
    }

    addPerson(opts = {}) {
      const id = opts.id || `person-${this.people.size + 1}`;
      const characterName = opts.character || this.firstCharacterName();
      const character = this.characters.get(characterName) || null;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const texture = makeCanvasTexture(this.THREE, canvas);
      const material = new this.THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.1,
        depthWrite: false,
      });
      const sprite = new this.THREE.Sprite(material);
      sprite.name = `crowd-${id}`;
      sprite.center.set(0.5, 0);
      sprite.renderOrder = -5;
      this.group.add(sprite);

      const hueLimit = Math.max(1, Math.min(this.config.hues, SHIRT_PALETTE.length));
      const hairLimit = Math.max(1, Math.min(this.config.hairColors, HAIR_PALETTE.length));
      const person = {
        id,
        sprite,
        material,
        texture,
        canvas,
        ctx,
        characterName,
        x: opts.x || 0,
        z: opts.z || 0,
        y: opts.y || 0,
        heading: opts.heading || 0,
        angularVel: 0,
        speed: opts.speed || 0,
        phase: opts.phase || Math.random() * TAU,
        hueIdx: opts.hueIdx === undefined ? (Math.random() * hueLimit) | 0 : opts.hueIdx,
        hairIdx: opts.hairIdx === undefined ? (Math.random() * hairLimit) | 0 : opts.hairIdx,
        cadenceMul: opts.cadenceMul || (1 + (Math.random() * 2 - 1) * this.config.cadenceVar),
        speedMul: opts.speedMul || (1 + (Math.random() * 2 - 1) * this.config.speedVar),
        sizeMul: opts.sizeMul || (1 + (Math.random() * 2 - 1) * this.config.sizeVar),
        route: Array.isArray(opts.route) ? opts.route.slice() : null,
        routeIndex: 0,
        routeHold: 0,
        falling: false,
        fallStage: 'none',
        fallVel: 0,
        fallRemoveY: -12,
        fallSpawnY: 10,
        fallReturnX: null,
        fallReturnZ: null,
        savedRoute: null,
        savedRouteIndex: 0,
        savedRouteHold: 0,
        savedSpeed: 0,
        view: opts.view || pickViewFromHeading(opts.heading || 0, null),
        scale: opts.scale || 1,
        radius: opts.radius || this.worldConfig.zoneRadius,
        config: this.config,
        worldConfig: this.worldConfig,
        baseSourceHeight: character && character.source.down ? character.source.down.naturalHeight || character.source.down.height : 96,
      };
      this.people.set(id, person);
      this.placePerson(person);
      this.drawPersonTexture(person, true);
      return person;
    }

    setPersonPosition(id, opts = {}) {
      const person = this.people.get(id);
      if (!person) return;
      if (opts.x !== undefined) person.x = opts.x;
      if (opts.z !== undefined) person.z = opts.z;
      if (opts.y !== undefined) person.y = opts.y;
      if (opts.heading !== undefined) person.heading = opts.heading;
      if (opts.radius !== undefined) person.radius = opts.radius;
      this.placePerson(person);
    }

    setPersonFalling(id, falling, opts = {}) {
      const person = this.people.get(id);
      if (!person) return;
      person.falling = !!falling;
      if (person.falling) {
        person.hoverPaused = false;
        person.savedRoute = Array.isArray(person.route) ? person.route.slice() : null;
        person.savedRouteIndex = person.routeIndex || 0;
        person.savedRouteHold = person.routeHold || 0;
        person.savedSpeed = person.speed || 0;
        person.routeHold = 0;
        person.route = null;
        person.speed = 0;
        person.fallStage = opts.mode === 'return' ? 'escape' : (opts.mode === 'spawn' ? 'spawn' : 'drop');
        person.fallVel = Number.isFinite(opts.fallVel) ? opts.fallVel : 0;
        person.fallRemoveY = Number.isFinite(opts.removeY) ? opts.removeY : -12;
        person.fallSpawnY = Number.isFinite(opts.spawnY) ? opts.spawnY : 10;
        person.fallReturnX = Number.isFinite(opts.returnX) ? opts.returnX : null;
        person.fallReturnZ = Number.isFinite(opts.returnZ) ? opts.returnZ : null;
        if (Number.isFinite(opts.startY)) person.y = opts.startY;
      } else {
        person.fallVel = 0;
        person.fallStage = 'none';
        person.fallRemoveY = -12;
        person.fallSpawnY = 10;
        person.fallReturnX = null;
        person.fallReturnZ = null;
        if (person.savedRoute) {
          person.route = person.savedRoute.slice();
          person.routeIndex = person.savedRouteIndex || 0;
          person.routeHold = person.savedRouteHold || 0;
          person.speed = person.savedSpeed || 0;
        }
        person.savedRoute = null;
        person.savedRouteIndex = 0;
        person.savedRouteHold = 0;
        person.savedSpeed = 0;
      }
    }

    removePerson(id) {
      const person = this.people.get(id);
      if (!person) return;
      this.group.remove(person.sprite);
      person.material.dispose();
      person.texture.dispose();
      this.people.delete(id);
    }

    clear() {
      Array.from(this.people.keys()).forEach(id => this.removePerson(id));
    }

    update(dt, camera) {
      const activeCamera = camera || this.camera;
      const people = Array.from(this.people.values());
      for (const person of people) {
        if (!this.people.has(person.id)) continue;
        if (person.falling) {
          if (this.tickFall(person, dt || 0)) continue;
        } else {
          this.tickRoute(person, dt || 0);
          if (activeCamera) this.updatePersonView(person, activeCamera);
          this.tickPhase(person, dt || 0);
        }
        this.placePerson(person);
        this.drawPersonTexture(person, false);
      }
    }

    tickFall(person, dt) {
      if (!person.falling) return false;
      const fallAccel = 18;
      person.fallVel += fallAccel * dt;
      person.y -= person.fallVel * dt;
      if (person.fallStage === 'escape') {
        if (person.y <= person.fallRemoveY) {
          person.fallVel = 0;
          // Let the sprite finish the drop at the bottom edge before we
          // warp it back in from the top on the next tick.
          person.fallStage = 'reenter';
        }
        return false;
      }
      if (person.fallStage === 'reenter') {
        if (Number.isFinite(person.fallReturnX)) person.x = person.fallReturnX;
        if (Number.isFinite(person.fallReturnZ)) person.z = person.fallReturnZ;
        person.y = person.fallSpawnY;
        person.fallVel = 0;
        person.fallStage = 'return';
        return false;
      }
      if (person.fallStage === 'spawn') {
        if (person.y <= 0) {
          person.y = 0;
          person.falling = false;
          person.fallStage = 'none';
          person.fallVel = 0;
          if (person.savedRoute) {
            person.route = person.savedRoute.slice();
            person.routeIndex = person.savedRouteIndex || 0;
            person.routeHold = person.savedRouteHold || 0;
            person.speed = person.savedSpeed || 0;
          }
          person.savedRoute = null;
          person.savedRouteIndex = 0;
          person.savedRouteHold = 0;
          person.savedSpeed = 0;
          return false;
        }
        return false;
      }
      if (person.fallStage === 'return') {
        if (person.y <= 0) {
          person.y = 0;
          person.falling = false;
          person.fallStage = 'none';
          person.fallVel = 0;
          if (person.savedRoute) {
            person.route = person.savedRoute.slice();
            person.routeIndex = person.savedRouteIndex || 0;
            person.routeHold = person.savedRouteHold || 0;
            person.speed = person.savedSpeed || 0;
          }
          person.savedRoute = null;
          person.savedRouteIndex = 0;
          person.savedRouteHold = 0;
          person.savedSpeed = 0;
          return false;
        }
        return false;
      }
      if (person.y <= person.fallRemoveY) {
        this.removePerson(person.id);
        return true;
      }
      return false;
    }

    tickRoute(person, dt) {
      if (person.hoverPaused) return;
      if (person.routeHold > 0) {
        person.routeHold = Math.max(0, person.routeHold - dt);
        return;
      }
      if (!person.route || person.route.length < 2 || !person.speed || !dt) return;
      const target = person.route[person.routeIndex % person.route.length];
      const advanceRouteTarget = () => {
        const reachedFinalTarget = person.routeIndex >= person.route.length - 1;
        const routeBeforeComplete = person.route;
        if (reachedFinalTarget && this.onRouteComplete) {
          const handled = this.onRouteComplete(person, target);
          if (handled || person.route !== routeBeforeComplete) return true;
        }
        if (target && target.dwell > 0) person.routeHold = target.dwell;
        if (reachedFinalTarget) {
          person.route = null;
          person.routeIndex = 0;
          return true;
        }
        person.routeIndex = person.routeIndex + 1;
        return false;
      };
      const dx = target.x - person.x;
      const dz = target.z - person.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.035) {
        if (advanceRouteTarget()) return;
        return;
      }
      const step = Math.min(dist, person.speed * person.speedMul * dt);
      const fromX = person.x;
      const fromZ = person.z;
      let nextX = fromX + (dx / dist) * step;
      let nextZ = fromZ + (dz / dist) * step;
      if (this.moveConstraint) {
        const constrained = this.moveConstraint({
          person,
          from: { x: fromX, z: fromZ },
          to: { x: nextX, z: nextZ },
          target: { x: target.x, z: target.z },
          step,
          dt,
        });
        if (constrained && Number.isFinite(constrained.x) && Number.isFinite(constrained.z)) {
          nextX = constrained.x;
          nextZ = constrained.z;
        }
        if (constrained && constrained.advanceTarget) {
          if (advanceRouteTarget()) {
            person.x = nextX;
            person.z = nextZ;
            const movedX = nextX - fromX;
            const movedZ = nextZ - fromZ;
            if (movedX * movedX + movedZ * movedZ > 1e-10) {
              person.heading = Math.atan2(movedZ, movedX);
            } else {
              person.heading = Math.atan2(dz, dx);
            }
            return;
          }
        }
      }
      person.x = nextX;
      person.z = nextZ;
      const movedX = nextX - fromX;
      const movedZ = nextZ - fromZ;
      if (movedX * movedX + movedZ * movedZ > 1e-10) {
        person.heading = Math.atan2(movedZ, movedX);
      } else {
        person.heading = Math.atan2(dz, dx);
      }
    }

    tickPhase(person, dt) {
      if (person.hoverPaused) return;
      const movingForward = !!(person.route && person.route.length > 1 && person.speed);
      const fwd = this.config.speed * person.speedMul;
      const speedFactor = movingForward ? clamp(fwd / 50, 0.2, 2.5) : 0.18;
      const stepHz = this.config.cadence * person.cadenceMul * speedFactor;
      person.phase += TAU * stepHz * dt;
    }

    placePerson(person) {
      const pos = this.tileToWorld ? this.tileToWorld(person.x, person.z) : { x: person.x, z: person.z };
      const aspect = person.canvas.width && person.canvas.height ? person.canvas.width / person.canvas.height : 0.62;
      const heightScale = person.view === 'top' ? this.worldConfig.topBodyScale * 1.8 : 1;
      const height = this.worldConfig.doorHeight * this.worldConfig.personDoorRatio * this.scale * person.scale * person.sizeMul * heightScale;
      const groundY = this.getTerrainHeight(person.x, person.z) + (person.y || 0);
      person.sprite.position.set(pos.x, groundY, pos.z);
      person.sprite.scale.set(height * aspect, height, 1);
    }

    updatePersonView(person, camera) {
      const nextView = pickCameraRelativeView(person, camera, {
        x: person.x,
        y: this.getTerrainHeight(person.x, person.z) + (person.y || 0),
        z: person.z,
      });
      if (nextView !== person.view) person.view = nextView;
    }

    drawPersonTexture(person) {
      const character = this.characters.get(person.characterName);
      if (!character) return;
      let viewRow = character.variants[person.view || 'down'];
      if (!viewRow || !viewRow.length) {
        for (const view of VIEW_KEYS) {
          if (character.variants[view] && character.variants[view].length) {
            viewRow = character.variants[view];
            break;
          }
        }
      }
      if (!viewRow || !viewRow.length) return;
      const hairCount = Math.max(1, Math.min(this.config.hairColors, HAIR_PALETTE.length));
      const paletteIdx = person.view === 'top' ? 0 : person.hueIdx * hairCount + (person.hairIdx || 0);
      const sprite = viewRow[Math.min(paletteIdx, viewRow.length - 1)];
      if (!sprite) return;
      drawAnimatedPerson(person.ctx, person, sprite, this.config, this.worldConfig);
      person.texture.needsUpdate = true;
    }

    firstCharacterName() {
      const first = this.characters.keys().next();
      return first.done ? 'townie' : first.value;
    }

    dispose() {
      this.clear();
      this.characters.clear();
      if (this.group.parent) this.group.parent.remove(this.group);
    }
  }

  TinyCrowdLayer.DEFAULT_CHARACTER_SETS = DEFAULT_CHARACTER_SETS;
  TinyCrowdLayer.DEFAULT_CONFIG = DEFAULT_CONFIG;
  TinyCrowdLayer.DEFAULT_WORLD_CONFIG = DEFAULT_WORLD_CONFIG;
  TinyCrowdLayer.SHIRT_PALETTE = SHIRT_PALETTE;
  TinyCrowdLayer.HAIR_PALETTE = HAIR_PALETTE;
  window.TinyCrowdLayer = TinyCrowdLayer;
})();
