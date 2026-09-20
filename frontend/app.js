/**
 * Spirula Mask Studio - Frontend Application
 */

class MaskStudio {
  constructor() {
    this.config = {
      datasetRoot: '',
      sequences: []
    };
    this.currentSequence = '';
    this.frames = [];
    this.currentIndex = 0;

    // View & Display settings
    this.viewMode = 'overlay'; // 'overlay' | 'side' | 'image' | 'mask'
    this.sideRightMode = 'binary'; // 'binary' | 'overlay'
    this.tool = 'brush'; // 'brush' | 'fill-out' | 'fill-in'
    this.currentDrawMode = 'paint'; // 'paint' (0) | 'clear' (255)
    this.drawingButton = null;
    this.brushSize = 40;
    this.overlayOpacity = 0.5;
    this.overlayColor = '#ef4444'; // Red default
    this.invertView = false;
    this.isTabHeld = false;
    this.isShiftTabHeld = false;
    this.isRHeld = false;
    this._lastCursorX = 0;
    this._lastCursorY = 0;
    this.highRes = false;
    this.autoSave = true;
    this.isDirty = false;

    // Playback
    this.isPlaying = false;
    this.playTimer = null;
    this.fps = 10;

    // Zoom & Pan state
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;
    this.spacePressed = false;

    // Drawing state
    this.isDrawing = false;
    this.lastDrawX = 0;
    this.lastDrawY = 0;

    // History (Undo/Redo)
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 20;

    // Elements & Canvases
    this.frameImg = new Image();
    this.maskCanvas = document.createElement('canvas');
    this.maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true });
    this.maskCtx.imageSmoothingEnabled = false;

    this.initDOMElements();
    this.initEvents();
    this.loadConfig();
  }

  initDOMElements() {
    // Header
    this.sequenceSelect = document.getElementById('sequence-select');
    this.btnRefreshSeq = document.getElementById('btn-refresh-seq');
    this.btnDatasetPath = document.getElementById('btn-dataset-path');
    this.frameInput = document.getElementById('frame-input');
    this.totalFramesSpan = document.getElementById('total-frames');
    this.fpsSelect = document.getElementById('fps-select');
    this.btnPlay = document.getElementById('btn-play');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnFirst = document.getElementById('btn-first');
    this.btnLast = document.getElementById('btn-last');
    this.maskStatusBadge = document.getElementById('mask-status-badge');
    this.saveStatusBadge = document.getElementById('save-status-badge');
    this.btnSave = document.getElementById('btn-save');
    this.autoSaveToggle = document.getElementById('auto-save-toggle');
    this.btnHelp = document.getElementById('btn-help');

    // Left Toolbar
    this.btnModeOverlay = document.getElementById('btn-mode-overlay');
    this.btnModeMask = document.getElementById('btn-mode-mask');
    this.btnModeSide = document.getElementById('btn-mode-side');

    this.toolButtons = {
      'brush': document.getElementById('tool-brush') || document.getElementById('tool-paint-out'),
      'fill-out': document.getElementById('tool-fill-out'),
      'fill-in': document.getElementById('tool-fill-in')
    };

    this.brushSizeSlider = document.getElementById('brush-size-slider');
    this.brushSizeVal = document.getElementById('brush-size-val');
    this.overlayOpacitySlider = document.getElementById('overlay-opacity');
    this.opacityVal = document.getElementById('opacity-val');
    this.invertViewToggle = document.getElementById('invert-view-toggle');
    this.btnFlashMask = document.getElementById('btn-flash-mask');
    this.zoomVal = document.getElementById('zoom-val');
    this.btnZoomIn = document.getElementById('btn-zoom-in');
    this.btnZoomOut = document.getElementById('btn-zoom-out');
    this.btnZoomFit = document.getElementById('btn-zoom-fit');
    this.btnZoom100 = document.getElementById('btn-zoom-100');

    // Viewport Canvases
    this.singleViewport = document.getElementById('single-viewport');
    this.mainCanvas = document.getElementById('main-canvas');
    this.mainCtx = this.mainCanvas.getContext('2d');
    this.cursorIndicator = document.getElementById('cursor-indicator');

    this.sideViewport = document.getElementById('side-viewport');
    this.sideCanvasLeft = document.getElementById('side-canvas-left');
    this.sideCtxLeft = this.sideCanvasLeft.getContext('2d');
    this.sideCanvasRight = document.getElementById('side-canvas-right');
    this.sideCtxRight = this.sideCanvasRight.getContext('2d');
    this.sideRightModeSelect = document.getElementById('side-right-mode');
    this.resBadgeLeft = document.getElementById('res-badge-left');

    this.loadingSpinner = document.getElementById('loading-spinner');
    this.loadingText = document.getElementById('loading-text');

    // Right Panel
    this.altPreviewSection = document.getElementById('alt-preview-section');
    this.altPreviewCard = document.getElementById('alt-preview-card');
    this.altPreviewCanvas = document.getElementById('alt-preview-canvas');
    this.altPreviewCtx = this.altPreviewCanvas ? this.altPreviewCanvas.getContext('2d') : null;
    this.altPreviewName = document.getElementById('alt-preview-name');
    this.altPreviewTag = document.getElementById('alt-preview-tag');

    this.infoFilename = document.getElementById('info-filename');
    this.infoRes = document.getElementById('info-res');
    this.infoMaskState = document.getElementById('info-mask-state');
    this.btnUndo = document.getElementById('btn-undo');
    this.btnRedo = document.getElementById('btn-redo');
    this.btnRevert = document.getElementById('btn-revert');
    this.btnCopyPrev = document.getElementById('btn-copy-prev');
    this.btnCopyNext = document.getElementById('btn-copy-next');
    this.btnInvertMask = document.getElementById('btn-invert-mask');
    this.btnClearKeep = document.getElementById('btn-clear-keep');
    this.btnClearExclude = document.getElementById('btn-clear-exclude');
    this.btnDeleteMask = document.getElementById('btn-delete-mask');
    this.highResToggle = document.getElementById('high-res-toggle');

    // Bottom Timeline
    this.timelineSlider = document.getElementById('timeline-slider');
    this.timelineCanvas = document.getElementById('timeline-canvas');
    this.timelineCtx = this.timelineCanvas.getContext('2d');
    this.coordsDisplay = document.getElementById('coords-display');
    this.statTotal = document.getElementById('stat-total');
    this.statMasks = document.getElementById('stat-masks');
    this.statMissing = document.getElementById('stat-missing');
    this.btnFindMissing = document.getElementById('btn-find-missing');

    // Modals
    this.helpModal = document.getElementById('help-modal');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.pathModal = document.getElementById('path-modal');
    this.btnClosePathModal = document.getElementById('btn-close-path-modal');
    this.btnCancelPath = document.getElementById('btn-cancel-path');
    this.btnSavePath = document.getElementById('btn-save-path');
    this.datasetPathInput = document.getElementById('dataset-path-input');

    // File Chooser Elements
    this.rootsList = document.getElementById('roots-list');
    this.chooserBreadcrumbs = document.getElementById('chooser-breadcrumbs');
    this.chooserList = document.getElementById('chooser-list');
    this.btnChooserUp = document.getElementById('btn-chooser-up');
    this.btnChooserRefresh = document.getElementById('btn-chooser-refresh');
    this.chooserDatasetIndicator = document.getElementById('chooser-dataset-indicator');
  }

  initEvents() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.resizeViewports();
      this.render();
      this.drawTimeline();
    });

    // Sequence Selection
    this.sequenceSelect.addEventListener('change', () => {
      this.currentSequence = this.sequenceSelect.value;
      this.loadFrames(this.currentSequence, 0, null);
    });
    this.btnRefreshSeq.addEventListener('click', () => this.loadConfig());

    // Dataset Path Modal & File Chooser
    this.btnDatasetPath.addEventListener('click', () => {
      const current = this.config.dataset_root || this.config.datasetRoot || '';
      this.datasetPathInput.value = current;
      this.pathModal.classList.remove('hidden');
      this.browseDirectory(current);
    });
    this.btnClosePathModal.addEventListener('click', () => this.pathModal.classList.add('hidden'));
    this.btnCancelPath.addEventListener('click', () => this.pathModal.classList.add('hidden'));
    this.btnSavePath.addEventListener('click', () => this.saveDatasetPath());
    this.btnChooserUp.addEventListener('click', () => {
      if (this.chooserParentPath) {
        this.browseDirectory(this.chooserParentPath);
      }
    });
    if (this.btnChooserRefresh) {
      this.btnChooserRefresh.addEventListener('click', () => {
        this.browseDirectory(this.chooserCurrentPath || '');
      });
    }

    // Navigation & Playback
    this.btnPrev.addEventListener('click', () => this.prevFrame());
    this.btnNext.addEventListener('click', () => this.nextFrame());
    this.btnFirst.addEventListener('click', () => this.gotoFrame(0));
    this.btnLast.addEventListener('click', () => this.gotoFrame(this.frames.length - 1));
    this.btnPlay.addEventListener('click', () => this.togglePlay());
    this.fpsSelect.addEventListener('change', () => {
      this.fps = parseInt(this.fpsSelect.value, 10);
      if (this.isPlaying) {
        this.stopPlay();
        this.startPlay();
      }
    });

    this.frameInput.addEventListener('change', () => {
      let idx = parseInt(this.frameInput.value, 10) - 1;
      this.gotoFrame(idx);
    });

    this.timelineSlider.addEventListener('input', () => {
      let idx = parseInt(this.timelineSlider.value, 10);
      this.gotoFrame(idx);
    });

    this.btnFindMissing.addEventListener('click', () => this.findNextMissing());

    // View Modes
    this.btnModeOverlay.addEventListener('click', () => this.setViewMode('overlay'));
    this.btnModeMask.addEventListener('click', () => this.setViewMode('mask'));
    this.btnModeSide.addEventListener('click', () => this.setViewMode('side'));
    this.sideRightModeSelect.addEventListener('change', () => {
      this.sideRightMode = this.sideRightModeSelect.value;
      this.render();
    });

    // Edit Tools
    Object.keys(this.toolButtons).forEach(toolName => {
      if (this.toolButtons[toolName]) {
        this.toolButtons[toolName].addEventListener('click', () => {
          if (toolName.startsWith('fill-') && this.tool === toolName) {
            this.setTool('brush');
          } else {
            this.setTool(toolName);
          }
        });
      }
    });

    // Brush & Overlay controls
    this.brushSizeSlider.addEventListener('input', () => {
      this.setBrushSize(parseInt(this.brushSizeSlider.value, 10));
    });
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.setBrushSize(parseInt(e.target.dataset.size, 10));
      });
    });

    this.overlayOpacitySlider.addEventListener('input', () => {
      this.overlayOpacity = parseInt(this.overlayOpacitySlider.value, 10) / 100;
      this.opacityVal.textContent = `${this.overlayOpacitySlider.value}%`;
      this.render();
    });

    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        this.overlayColor = swatch.dataset.color;
        this.recolorMaskCanvas();
        this.render();
      });
    });

    this.invertViewToggle.addEventListener('change', () => {
      this.invertView = this.invertViewToggle.checked;
      this.reloadCurrentMask();
    });

    // Flash / Peek counterpart view (Tab button)
    const flashStart = () => { this.isTabHeld = true; this.render(); };
    const flashEnd = () => { this.isTabHeld = false; this.render(); };
    this.btnFlashMask.addEventListener('mousedown', flashStart);
    this.btnFlashMask.addEventListener('mouseup', flashEnd);
    this.btnFlashMask.addEventListener('mouseleave', flashEnd);

    // Zoom Controls
    this.btnZoomIn.addEventListener('click', () => this.zoomAtCenter(1.3));
    this.btnZoomOut.addEventListener('click', () => this.zoomAtCenter(1 / 1.3));
    this.btnZoomFit.addEventListener('click', () => this.fitToScreen());
    this.btnZoom100.addEventListener('click', () => this.zoom100());

    // Frame Operations
    this.btnSave.addEventListener('click', () => this.saveCurrentMask());
    this.autoSaveToggle.addEventListener('change', () => {
      this.autoSave = this.autoSaveToggle.checked;
    });

    this.btnUndo.addEventListener('click', () => this.undo());
    this.btnRedo.addEventListener('click', () => this.redo());
    this.btnRevert.addEventListener('click', () => this.revertEdits());

    this.btnCopyPrev.addEventListener('click', () => this.copyFromPrev());
    this.btnCopyNext.addEventListener('click', () => this.copyFromNext());
    this.btnInvertMask.addEventListener('click', () => this.invertEntireMask());
    this.btnClearKeep.addEventListener('click', () => this.clearMask(255));
    this.btnClearExclude.addEventListener('click', () => this.clearMask(0));
    this.btnDeleteMask.addEventListener('click', () => this.deleteCurrentMask());

    this.highResToggle.addEventListener('change', () => {
      this.highRes = this.highResToggle.checked;
      this.loadCurrentFrame();
    });

    if (this.altPreviewCard) {
      this.altPreviewCard.addEventListener('click', () => {
        const effective = this.getEffectiveViewMode();
        if (effective === 'mask') {
          this.setViewMode('overlay');
        } else {
          this.setViewMode('mask');
        }
      });
    }

    // Modals
    this.btnHelp.addEventListener('click', () => this.helpModal.classList.remove('hidden'));
    this.btnCloseModal.addEventListener('click', () => this.helpModal.classList.add('hidden'));

    // Canvas Mouse & Interaction Events
    this.setupCanvasInteractions(this.mainCanvas);
    this.setupCanvasInteractions(this.sideCanvasLeft);
    this.setupCanvasInteractions(this.sideCanvasRight);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
    window.addEventListener('mouseup', (e) => {
      if (this.isDrawing && (e.button === undefined || e.button === this.drawingButton)) {
        this.isDrawing = false;
        this.drawingButton = null;
        this.setDirty(true);
        this.drawTimeline();
        this.saveCurrentState();
      }
      if (this.isPanning && (e.button === 1 || e.button === 0)) {
        this.isPanning = false;
      }
    });
    window.addEventListener('blur', () => {
      this.spacePressed = false;
      this.isTabHeld = false;
      this.isShiftTabHeld = false;
      this.isRHeld = false;
      if (this.isDrawing) {
        this.isDrawing = false;
        this.drawingButton = null;
        this.setDirty(true);
      }
      this.isPanning = false;
      this.updateBrushDisplay();
      this.updateBrushCursor();
      this.render();
    });
  }

  // --- API & Dataset Loading ---

  async loadConfig() {
    this.showLoading(true, "Scanning dataset sequences...");
    try {
      const resp = await fetch('/api/config');
      const data = await resp.json();
      this.config = data;
      this.config.dataset_root = data.dataset_root || data.datasetRoot || '';
      this.config.datasetRoot = this.config.dataset_root;
      this.datasetPathInput.value = this.config.dataset_root;

      const serverState = data.state || {};
      let localSeq = null;
      let localFrameIdx = null;
      let localFilename = null;
      try {
        localSeq = localStorage.getItem('mask_studio_sequence');
        localFrameIdx = localStorage.getItem('mask_studio_frame_index');
        localFilename = localStorage.getItem('mask_studio_frame_filename');
      } catch (e) {}

      this.sequenceSelect.innerHTML = '';
      if (!data.sequences || data.sequences.length === 0) {
        this.sequenceSelect.innerHTML = '<option value="">No sequences found</option>';
        this.showLoading(false);
        return;
      }

      data.sequences.forEach(seq => {
        const opt = document.createElement('option');
        opt.value = seq.name;
        opt.textContent = `${seq.name} (${seq.image_count} frames, ${seq.mask_count} masks)`;
        this.sequenceSelect.appendChild(opt);
      });

      // Prefer server state sequence, then local storage, fallback to first
      const candidateSeq = serverState.sequence || localSeq;
      const matchedSeq = data.sequences.find(s => s.name === candidateSeq);
      this.currentSequence = matchedSeq ? matchedSeq.name : data.sequences[0].name;
      this.sequenceSelect.value = this.currentSequence;

      // Prefer server state frame info, then local storage
      const candidateFilename = (matchedSeq && candidateSeq === (serverState.sequence || localSeq))
        ? (serverState.frame_filename || localFilename)
        : null;
      const candidateIndex = (matchedSeq && candidateSeq === (serverState.sequence || localSeq))
        ? (serverState.frame_index !== undefined ? serverState.frame_index : (localFrameIdx !== null ? parseInt(localFrameIdx, 10) : 0))
        : 0;

      await this.loadFrames(this.currentSequence, candidateIndex, candidateFilename);
    } catch (err) {
      console.error("Failed to load config:", err);
      alert("Failed to load dataset: " + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  async saveDatasetPath() {
    const newPath = this.datasetPathInput.value.trim();
    if (!newPath) return;

    this.showLoading(true, "Applying new dataset path...");
    try {
      const resp = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_root: newPath })
      });
      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.detail || "Failed to set path");
      }
      this.pathModal.classList.add('hidden');
      try {
        localStorage.setItem('mask_studio_dataset_root', newPath);
        localStorage.removeItem('mask_studio_sequence');
        localStorage.removeItem('mask_studio_frame_index');
        localStorage.removeItem('mask_studio_frame_filename');
      } catch (e) {}
      await this.loadConfig();
    } catch (err) {
      alert("Error setting dataset path: " + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async browseDirectory(targetPath = '') {
    if (!this.chooserList) return;
    this.chooserList.innerHTML = '<div class="chooser-loading">Loading directories...</div>';
    try {
      let current = '';
      if (typeof targetPath === 'string' && targetPath.trim()) {
        current = targetPath.trim();
      } else {
        current = this.config.dataset_root || this.config.datasetRoot || '';
      }
      const url = current ? `/api/browse?path=${encodeURIComponent(current)}` : '/api/browse';
      console.log(`[browseDirectory] Fetching: ${url}`);
      const resp = await fetch(url);
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.detail || `Server returned ${resp.status} ${resp.statusText}`);
      }
      const data = await resp.json();
      console.log("[browseDirectory] Result:", data);

      this.chooserCurrentPath = data.current_path;
      this.chooserParentPath = data.parent_path;
      if (this.datasetPathInput) {
        this.datasetPathInput.value = data.current_path;
      }

      // Enable/disable up button
      if (this.btnChooserUp) {
        this.btnChooserUp.disabled = !data.parent_path;
      }

      // Dataset indicator
      if (this.chooserDatasetIndicator) {
        if (data.is_current_dataset) {
          this.chooserDatasetIndicator.classList.remove('hidden');
        } else {
          this.chooserDatasetIndicator.classList.add('hidden');
        }
      }

      // Render roots / shortcuts
      if (this.rootsList) {
        this.rootsList.innerHTML = '';
        (data.roots || []).forEach(r => {
          const pill = document.createElement('button');
          pill.type = 'button';
          pill.className = 'root-pill';
          pill.textContent = r;
          pill.title = `Jump to ${r}`;
          pill.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.browseDirectory(r);
          });
          this.rootsList.appendChild(pill);
        });
      }

      // Render breadcrumbs
      this.renderBreadcrumbs(data.current_path);

      // Render directory items
      this.chooserList.innerHTML = '';
      if (!data.directories || data.directories.length === 0) {
        this.chooserList.innerHTML = `<div class="chooser-empty">No subdirectories found in <code>${this.escapeHtml(data.current_path)}</code></div>`;
        return;
      }

      data.directories.forEach(dir => {
        const item = document.createElement('div');
        item.className = 'chooser-item';
        item.dataset.path = dir.path;

        let badgeHtml = '';
        if (dir.has_images && dir.has_masks) {
          badgeHtml = '<span class="chooser-badge badge-dataset">🎭 Dataset (Images & Masks)</span>';
        } else if (dir.has_images) {
          badgeHtml = '<span class="chooser-badge badge-dataset">🖼️ Images</span>';
        }

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'btn-open-folder';
        openBtn.textContent = 'Open ➔';
        openBtn.title = `Enter ${dir.name}`;
        openBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.browseDirectory(dir.path);
        });

        item.innerHTML = `
          <div class="chooser-item-left">
            <span class="chooser-item-icon">📁</span>
            <span class="chooser-item-name">${this.escapeHtml(dir.name)}</span>
          </div>
          <div class="chooser-item-right">
            ${badgeHtml}
          </div>
        `;
        item.querySelector('.chooser-item-right').appendChild(openBtn);

        // Single click: select path
        item.addEventListener('click', (e) => {
          e.preventDefault();
          this.chooserList.querySelectorAll('.chooser-item').forEach(el => el.classList.remove('selected'));
          item.classList.add('selected');
          if (this.datasetPathInput) {
            this.datasetPathInput.value = dir.path;
          }
          if (dir.is_dataset) {
            if (this.chooserDatasetIndicator) this.chooserDatasetIndicator.classList.remove('hidden');
          } else {
            if (this.chooserDatasetIndicator) this.chooserDatasetIndicator.classList.add('hidden');
          }
        });

        // Double click: navigate into directory
        item.addEventListener('dblclick', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.browseDirectory(dir.path);
        });

        this.chooserList.appendChild(item);
      });

    } catch (err) {
      console.error("[browseDirectory] Error:", err);
      if (this.chooserList) {
        this.chooserList.innerHTML = `<div class="chooser-empty text-danger">Failed to browse: ${this.escapeHtml(err.message)}</div>`;
      }
    }
  }

  renderBreadcrumbs(fullPath) {
    this.chooserBreadcrumbs.innerHTML = '';
    const isWindows = fullPath.includes('\\') || /^[A-Za-z]:/.test(fullPath);
    const sep = isWindows ? '\\' : '/';
    const parts = fullPath.split(/[\\\/]+/).filter(Boolean);

    let accumulated = isWindows && /^[A-Za-z]:/.test(fullPath) ? '' : '/';

    // Root crumb
    const rootCrumb = document.createElement('span');
    rootCrumb.className = 'crumb';
    rootCrumb.textContent = isWindows && /^[A-Za-z]:/.test(fullPath) ? parts[0] + '\\' : '/';
    const rootTarget = rootCrumb.textContent;
    rootCrumb.addEventListener('click', () => this.browseDirectory(rootTarget));
    this.chooserBreadcrumbs.appendChild(rootCrumb);

    const startIndex = isWindows && /^[A-Za-z]:/.test(fullPath) ? 1 : 0;
    if (isWindows && /^[A-Za-z]:/.test(fullPath)) {
      accumulated = parts[0] + '\\';
    }

    for (let i = startIndex; i < parts.length; i++) {
      const sepSpan = document.createElement('span');
      sepSpan.className = 'crumb-separator';
      sepSpan.textContent = '›';
      this.chooserBreadcrumbs.appendChild(sepSpan);

      const part = parts[i];
      if (accumulated.endsWith(sep)) {
        accumulated += part;
      } else {
        accumulated += sep + part;
      }
      const target = accumulated;

      const crumb = document.createElement('span');
      crumb.className = 'crumb';
      crumb.textContent = part;
      crumb.addEventListener('click', () => this.browseDirectory(target));
      this.chooserBreadcrumbs.appendChild(crumb);
    }
  }

  async loadFrames(seqName, targetIndex = 0, targetFilename = null) {
    this.showLoading(true, `Loading sequence ${seqName}...`);
    try {
      const resp = await fetch(`/api/frames/${encodeURIComponent(seqName)}`);
      if (!resp.ok) throw new Error("Could not load frames for sequence");
      this.frames = await resp.json();

      this.totalFramesSpan.textContent = this.frames.length;
      this.timelineSlider.max = Math.max(0, this.frames.length - 1);

      let initialIdx = 0;
      if (targetFilename) {
        const found = this.frames.findIndex(f => f.filename === targetFilename);
        if (found !== -1) {
          initialIdx = found;
        } else if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < this.frames.length) {
          initialIdx = targetIndex;
        }
      } else if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < this.frames.length) {
        initialIdx = targetIndex;
      }

      this.currentIndex = initialIdx;

      this.updateTimelineStats();
      this.drawTimeline();
      await this.loadCurrentFrame();
      this.resizeViewports();
      this.fitToScreen();
      this.saveCurrentState();
    } catch (err) {
      console.error(err);
      alert("Error loading frames: " + err.message);
    } finally {
      this.showLoading(false);
    }
  }

  saveCurrentState(immediate = false) {
    if (!this.frames || this.frames.length === 0) return;
    const currentFrame = this.frames[this.currentIndex];
    const stateObj = {
      sequence: this.currentSequence,
      frame_index: this.currentIndex,
      frame_filename: currentFrame ? currentFrame.filename : null,
      dataset_root: this.config?.dataset_root || ''
    };

    try {
      if (stateObj.sequence) localStorage.setItem('mask_studio_sequence', stateObj.sequence);
      if (stateObj.frame_index !== undefined) localStorage.setItem('mask_studio_frame_index', String(stateObj.frame_index));
      if (stateObj.frame_filename) localStorage.setItem('mask_studio_frame_filename', stateObj.frame_filename);
      if (stateObj.dataset_root) localStorage.setItem('mask_studio_dataset_root', stateObj.dataset_root);
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }

    if (this._saveStateTimer) clearTimeout(this._saveStateTimer);

    const sendToServer = () => {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stateObj)
      }).catch(err => console.warn("Could not save state to server:", err));
    };

    if (immediate) {
      sendToServer();
    } else {
      this._saveStateTimer = setTimeout(sendToServer, 600);
    }
  }

  updateTimelineStats() {
    const total = this.frames.length;
    const maskCount = this.frames.filter(f => f.has_mask).length;
    const missing = total - maskCount;

    this.statTotal.textContent = total;
    this.statMasks.textContent = maskCount;
    this.statMissing.textContent = missing;
  }

  // --- Frame & Mask Display ---

  async loadCurrentFrame() {
    if (!this.frames || this.frames.length === 0) return;

    this.currentLoadToken = (this.currentLoadToken || 0) + 1;
    const token = this.currentLoadToken;

    const frame = this.frames[this.currentIndex];
    this.frameInput.value = this.currentIndex + 1;
    this.timelineSlider.value = this.currentIndex;
    this.infoFilename.textContent = frame.filename;

    // Update status badge
    if (frame.has_mask) {
      this.maskStatusBadge.textContent = "Mask Present";
      this.maskStatusBadge.className = "badge badge-present";
      this.infoMaskState.textContent = "Present (PNG)";
    } else {
      this.maskStatusBadge.textContent = "No Mask";
      this.maskStatusBadge.className = "badge badge-missing";
      this.infoMaskState.textContent = "None";
    }

    this.setDirty(false);
    this.clearHistory();

    // Immediately clear mask canvas so previous frame's mask never lingers
    this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
    this.render();

    const resParam = this.highRes ? "full" : "preview";
    const imgUrl = `/api/image/${encodeURIComponent(this.currentSequence)}/${encodeURIComponent(frame.filename)}?res=${resParam}`;

    this.showLoading(true, `Loading frame ${this.currentIndex + 1}...`);

    await new Promise((resolve) => {
      this.frameImg.onload = () => {
        if (this.currentLoadToken !== token) {
          resolve();
          return;
        }
        const w = this.frameImg.naturalWidth;
        const h = this.frameImg.naturalHeight;
        this.infoRes.textContent = `${w} × ${h}`;
        this.resBadgeLeft.textContent = `${w}×${h}`;

        // Prepare mask canvas to match dimensions
        this.maskCanvas.width = w;
        this.maskCanvas.height = h;
        this.maskCtx.clearRect(0, 0, w, h);

        resolve();
      };
      this.frameImg.onerror = () => {
        console.error("Failed to load image:", imgUrl);
        resolve();
      };
      this.frameImg.src = imgUrl;
    });

    if (this.currentLoadToken !== token) return;

    // Load mask if present
    if (frame.has_mask) {
      await this.reloadCurrentMask(token);
    } else {
      // Blank mask (transparent, all keep)
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      this.recordHistorySnapshot();
      this.render();
      this.drawTimeline();
      this.showLoading(false);
    }
  }

  async reloadCurrentMask(token = null) {
    const frame = this.frames[this.currentIndex];
    if (!frame.has_mask) return;

    const resParam = this.highRes ? "full" : "preview";
    const maskUrl = `/api/mask/${encodeURIComponent(this.currentSequence)}/${encodeURIComponent(frame.filename)}?res=${resParam}&t=${Date.now()}`;

    const maskImg = new Image();
    await new Promise((resolve) => {
      maskImg.onload = () => {
        if (token && this.currentLoadToken !== token) {
          resolve();
          return;
        }
        const w = this.maskCanvas.width;
        const h = this.maskCanvas.height;

        // Temporary canvas to process grayscale PNG
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = w;
        tempCanvas.height = h;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.imageSmoothingEnabled = false;
        tempCtx.drawImage(maskImg, 0, 0, w, h);

        const imgData = tempCtx.getImageData(0, 0, w, h);
        const data = imgData.data;

        // Parse tint color
        const { r: tr, g: tg, b: tb } = this.hexToRgb(this.overlayColor);

        // Convert grayscale into tinted overlay
        // By default: 0 (black/masked) gets tinted, 255 (white/kept) becomes transparent.
        // If invertView is on: 255 gets tinted, 0 becomes transparent.
        const targetVal = this.invertView ? 255 : 0;

        for (let i = 0; i < data.length; i += 4) {
          const gray = data[i]; // Grayscale R=G=B
          const isTarget = Math.abs(gray - targetVal) < 128;
          if (isTarget) {
            data[i] = tr;
            data[i + 1] = tg;
            data[i + 2] = tb;
            data[i + 3] = 255; // Solid in maskCanvas, opacity applied during drawImage
          } else {
            data[i + 3] = 0; // Transparent (kept)
          }
        }

        if (token && this.currentLoadToken !== token) {
          resolve();
          return;
        }

        this.maskCtx.clearRect(0, 0, w, h);
        this.maskCtx.putImageData(imgData, 0, 0);

        this.recordHistorySnapshot();
        this.render();
        this.drawTimeline();
        this.showLoading(false);
        resolve();
      };
      maskImg.onerror = () => {
        if (!token || this.currentLoadToken === token) {
          console.error("Failed to load mask:", maskUrl);
          this.showLoading(false);
        }
        resolve();
      };
      maskImg.src = maskUrl;
    });
  }

  recolorMaskCanvas() {
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    if (w === 0 || h === 0) return;

    const { r: tr, g: tg, b: tb } = this.hexToRgb(this.overlayColor);
    const imgData = this.maskCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        data[i] = tr;
        data[i + 1] = tg;
        data[i + 2] = tb;
      }
    }
    this.maskCtx.putImageData(imgData, 0, 0);
  }

  // --- Viewport & Canvas Rendering ---

  resizeViewports() {
    if (this.viewMode === 'side') {
      const wrapperLeft = this.sideCanvasLeft.parentElement;
      const wrapperRight = this.sideCanvasRight.parentElement;
      this.sideCanvasLeft.width = wrapperLeft.clientWidth;
      this.sideCanvasLeft.height = wrapperLeft.clientHeight;
      this.sideCanvasRight.width = wrapperRight.clientWidth;
      this.sideCanvasRight.height = wrapperRight.clientHeight;
    } else {
      const container = this.singleViewport;
      this.mainCanvas.width = container.clientWidth;
      this.mainCanvas.height = container.clientHeight;
    }
  }

  setViewMode(mode) {
    if (this.viewMode === mode) return;
    const prevMode = this.viewMode;
    this.viewMode = mode;
    document.querySelectorAll('.tool-section .btn-tool').forEach(b => {
      if (b.id.startsWith('btn-mode-')) b.classList.remove('active');
    });

    if (mode === 'overlay') this.btnModeOverlay.classList.add('active');
    if (mode === 'mask') this.btnModeMask.classList.add('active');
    if (mode === 'side') this.btnModeSide.classList.add('active');

    const wasSide = (prevMode === 'side');
    const isSide = (mode === 'side');

    if (isSide) {
      this.singleViewport.classList.remove('active');
      this.sideViewport.classList.add('active');
    } else {
      this.sideViewport.classList.remove('active');
      this.singleViewport.classList.add('active');
    }

    this.resizeViewports();
    if (wasSide !== isSide) {
      this.fitToScreen();
    }
    this.render();
  }

  getEffectiveViewMode() {
    if (this.isShiftTabHeld) {
      return 'raw-image';
    }
    if (this.isTabHeld) {
      if (this.viewMode === 'overlay') return 'mask';
      if (this.viewMode === 'mask') return 'overlay';
    }
    return this.viewMode;
  }

  render() {
    const effectiveMode = this.getEffectiveViewMode();
    if (effectiveMode === 'side' || this.viewMode === 'side') {
      this.renderSideBySide();
    } else {
      this.renderSingle(effectiveMode);
    }
    this.renderAltPreview();
  }

  renderSingle(mode = this.getEffectiveViewMode()) {
    const ctx = this.mainCtx;
    const canvas = this.mainCanvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!this.frameImg.naturalWidth) return;

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    if (mode === 'mask') {
      // Pure mask mode: draw black background, then white valid/kept areas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.maskCanvas, 0, 0);
      ctx.restore();
    } else if (mode === 'raw-image') {
      // Raw RGB image only (no mask overlay)
      ctx.drawImage(this.frameImg, 0, 0);
    } else {
      // Overlay Mode (or peek overlay in mask mode)
      // 1. Draw RGB image
      ctx.drawImage(this.frameImg, 0, 0);

      // 2. Draw Mask Overlay
      ctx.save();
      ctx.globalAlpha = this.overlayOpacity;
      ctx.drawImage(this.maskCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Draw active tool previews
    this.renderToolPreviews(ctx);

    ctx.restore();
  }

  renderSideBySide() {
    const ctxL = this.sideCtxLeft;
    const ctxR = this.sideCtxRight;
    const canvasL = this.sideCanvasLeft;
    const canvasR = this.sideCanvasRight;

    ctxL.clearRect(0, 0, canvasL.width, canvasL.height);
    ctxR.clearRect(0, 0, canvasR.width, canvasR.height);

    if (!this.frameImg.naturalWidth) return;

    // Left Viewport: RGB Image
    ctxL.save();
    ctxL.translate(this.panX, this.panY);
    ctxL.scale(this.zoom, this.zoom);
    ctxL.drawImage(this.frameImg, 0, 0);
    ctxL.restore();

    // Right Viewport: Mask or Overlay
    ctxR.save();
    ctxR.translate(this.panX, this.panY);
    ctxR.scale(this.zoom, this.zoom);

    const rightMode = this.isTabHeld
      ? (this.sideRightMode === 'overlay' ? 'binary' : 'overlay')
      : this.sideRightMode;

    if (rightMode === 'overlay') {
      ctxR.drawImage(this.frameImg, 0, 0);
      if (!this.isShiftTabHeld) {
        ctxR.save();
        ctxR.globalAlpha = this.overlayOpacity;
        ctxR.drawImage(this.maskCanvas, 0, 0);
        ctxR.restore();
      }
    } else {
      if (this.isShiftTabHeld) {
        ctxR.drawImage(this.frameImg, 0, 0);
      } else {
        // Binary B&W mask: background black, valid kept area white, masked out area black
        ctxR.fillStyle = '#ffffff';
        ctxR.fillRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
        ctxR.save();
        ctxR.globalCompositeOperation = 'destination-out';
        ctxR.drawImage(this.maskCanvas, 0, 0);
        ctxR.restore();
      }
    }

    this.renderToolPreviews(ctxR);
    ctxR.restore();
  }

  renderToolPreviews(ctx) {
    // No-op (active tools are only brush paint-out and paint-in)
  }

  renderAltPreview() {
    if (!this.altPreviewCanvas || !this.altPreviewCtx) return;
    const canvas = this.altPreviewCanvas;
    const ctx = this.altPreviewCtx;

    if (!this.frameImg || !this.frameImg.naturalWidth) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const imgW = this.frameImg.naturalWidth;
    const imgH = this.frameImg.naturalHeight;
    const targetW = 480;
    const targetH = Math.max(1, Math.round(targetW * (imgH / imgW)));

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, targetW, targetH);

    const effectiveMode = this.getEffectiveViewMode();
    // When viewing the mask, the preview should show the image.
    // When viewing the image (overlay / raw-image / side), the preview should show the mask.
    const showImage = (effectiveMode === 'mask');

    if (this.altPreviewName) {
      this.altPreviewName.textContent = showImage ? 'Image' : 'Mask';
    }
    if (this.altPreviewTag) {
      this.altPreviewTag.textContent = showImage ? 'Image' : 'Mask';
      this.altPreviewTag.className = showImage ? 'badge badge-info' : 'badge badge-mask';
    }

    if (showImage) {
      // Show full RGB frame image
      ctx.drawImage(this.frameImg, 0, 0, targetW, targetH);
    } else {
      // Show Binary Mask (Black = masked out, White = kept scene)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(this.maskCanvas, 0, 0, targetW, targetH);
      ctx.restore();
    }
  }

  // --- Canvas Mouse & Tool Interactions ---

  setupCanvasInteractions(canvas) {
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e, canvas));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e, canvas));
    canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e, canvas));
    canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    canvas.addEventListener('wheel', (e) => this.handleWheel(e, canvas), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  getCanvasCoords(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen pixel to image coordinate via pan/zoom
    const imgX = (mouseX - this.panX) / this.zoom;
    const imgY = (mouseY - this.panY) / this.zoom;
    return { mouseX, mouseY, imgX, imgY };
  }

  handleMouseDown(e, canvas) {
    const coords = this.getCanvasCoords(e, canvas);

    // Pan with Middle Mouse Button or Space + Left Button
    if (e.button === 1 || (e.button === 0 && this.spacePressed)) {
      this.isPanning = true;
      this.startPanX = e.clientX - this.panX;
      this.startPanY = e.clientY - this.panY;
      canvas.style.cursor = 'grabbing';
      return;
    }

    // Left click (0) paints/fills mask, Right click (2) clears/fills clear
    if (e.button === 0 || e.button === 2) {
      if (this.isDrawing) return;

      if (this.tool === 'brush' || this.tool === 'paint-out' || this.tool === 'paint-in') {
        this.isDrawing = true;
        this.drawingButton = e.button;
        this.currentDrawMode = (e.button === 0) ? 'paint' : 'clear';
        this.recordHistorySnapshot();
        this.lastDrawX = coords.imgX;
        this.lastDrawY = coords.imgY;
        this.drawStroke(coords.imgX, coords.imgY, coords.imgX, coords.imgY, this.currentDrawMode);
      } else if (this.tool === 'fill-out') {
        const fillType = (e.button === 0) ? 'fill-mask' : 'fill-clear';
        this.floodFill(Math.floor(coords.imgX), Math.floor(coords.imgY), fillType);
      } else if (this.tool === 'fill-in') {
        const fillType = (e.button === 0) ? 'fill-clear' : 'fill-mask';
        this.floodFill(Math.floor(coords.imgX), Math.floor(coords.imgY), fillType);
      }
    }
  }

  handleMouseMove(e, canvas) {
    const coords = this.getCanvasCoords(e, canvas);
    this.currentMousePos = { x: coords.imgX, y: coords.imgY };
    this.coordsDisplay.textContent = `X: ${Math.round(coords.imgX)}, Y: ${Math.round(coords.imgY)}`;

    // Update floating circular brush cursor
    this.updateBrushCursor(e.clientX, e.clientY);

    if (this.isPanning) {
      this.panX = e.clientX - this.startPanX;
      this.panY = e.clientY - this.startPanY;
      this.render();
      return;
    }

    if (this.isDrawing) {
      this.drawStroke(this.lastDrawX, this.lastDrawY, coords.imgX, coords.imgY, this.currentDrawMode);
      this.lastDrawX = coords.imgX;
      this.lastDrawY = coords.imgY;
    }
  }

  handleMouseUp(e, canvas) {
    if (this.isPanning) {
      this.isPanning = false;
      canvas.style.cursor = this.spacePressed ? 'grab' : 'crosshair';
      return;
    }

    if (this.isDrawing) {
      if (e.button === undefined || e.button === this.drawingButton) {
        this.isDrawing = false;
        this.drawingButton = null;
        this.setDirty(true);
        this.drawTimeline();
        this.saveCurrentState();
      }
    }
  }

  handleMouseLeave() {
    this.cursorIndicator.style.display = 'none';
    if (this.isDrawing) {
      this.isDrawing = false;
      this.drawingButton = null;
      this.setDirty(true);
      this.drawTimeline();
      this.saveCurrentState();
    }
  }

  handleWheel(e, canvas) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // If Alt / Shift held, adjust brush size with wheel
    if (e.altKey || e.shiftKey) {
      const delta = e.deltaY < 0 ? 5 : -5;
      this.setBrushSize(Math.max(2, Math.min(400, this.brushSize + delta)));
      this.updateBrushCursor(e.clientX, e.clientY);
      return;
    }

    // Zoom at mouse location
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    this.zoomAtPoint(mouseX, mouseY, factor);
  }

  getEffectiveBrushSize() {
    if (this.isRHeld) {
      return Math.max(1, Math.round(this.brushSize / 2));
    }
    return this.brushSize;
  }

  updateBrushDisplay() {
    const effective = this.getEffectiveBrushSize();
    if (this.isRHeld) {
      this.brushSizeVal.textContent = `${effective} (Fine)`;
    } else {
      this.brushSizeVal.textContent = this.brushSize;
    }
  }

  updateBrushCursor(clientX, clientY) {
    if (clientX !== undefined && clientY !== undefined) {
      this._lastCursorX = clientX;
      this._lastCursorY = clientY;
    }
    if (this.spacePressed || this.isPanning || (this.tool && this.tool.startsWith('fill-'))) {
      this.cursorIndicator.style.display = 'none';
      return;
    }
    const effectiveRadius = this.getEffectiveBrushSize();
    const screenRadius = effectiveRadius * this.zoom;
    this.cursorIndicator.style.display = 'block';
    if (this._lastCursorX !== undefined && this._lastCursorY !== undefined) {
      this.cursorIndicator.style.left = `${this._lastCursorX}px`;
      this.cursorIndicator.style.top = `${this._lastCursorY}px`;
    }
    this.cursorIndicator.style.width = `${screenRadius * 2}px`;
    this.cursorIndicator.style.height = `${screenRadius * 2}px`;
    if (this.isRHeld) {
      this.cursorIndicator.classList.add('cursor-fine');
    } else {
      this.cursorIndicator.classList.remove('cursor-fine');
    }
  }

  drawStroke(x0, y0, x1, y1, mode = this.currentDrawMode || 'paint') {
    const ctx = this.maskCtx;
    ctx.save();

    if (mode === 'paint') {
      // Paint (0): solid tint
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.overlayColor;
      ctx.fillStyle = this.overlayColor;
    } else {
      // Clear (255): erase tint back to transparent
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.fillStyle = 'rgba(0,0,0,1)';
    }

    const radius = this.getEffectiveBrushSize();
    ctx.lineWidth = radius * 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Fill caps
    ctx.beginPath();
    ctx.arc(x1, y1, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    this.render();
  }

  floodFill(startX, startY, fillType) {
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    if (w === 0 || h === 0) return;
    if (startX < 0 || startX >= w || startY < 0 || startY >= h) return;

    const imgData = this.maskCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const startIdx = (startY * w + startX) * 4;
    const isStartMasked = data[startIdx + 3] >= 128;

    if (fillType === 'fill-mask') {
      // Trying to fill clear area with mask. If clicked pixel is already solid mask, do nothing.
      if (isStartMasked) return;
    } else if (fillType === 'fill-clear') {
      // Trying to fill masked area with clear. If clicked pixel is already clear, do nothing.
      if (!isStartMasked) return;
    } else {
      return;
    }

    this.recordHistorySnapshot();

    const { r: tr, g: tg, b: tb } = this.hexToRgb(this.overlayColor);

    // Target check: does (x, y) qualify as part of the connected component to fill?
    // Ignores opacity variations so flood fill operates cleanly without anti-aliasing artifacts
    const targetMatch = (x, y) => {
      const idx = (y * w + x) * 4;
      if (fillType === 'fill-mask') {
        return data[idx + 3] < 128;
      } else {
        return data[idx + 3] >= 64;
      }
    };

    const visited = new Uint8Array(w * h);
    const stack = [[startX, startY]];
    visited[startY * w + startX] = 1;

    while (stack.length > 0) {
      const [cx, cy] = stack.pop();

      let left = cx;
      while (left > 0 && targetMatch(left - 1, cy) && !visited[cy * w + left - 1]) {
        left--;
        visited[cy * w + left] = 1;
      }

      let right = cx;
      while (right < w - 1 && targetMatch(right + 1, cy) && !visited[cy * w + right + 1]) {
        right++;
        visited[cy * w + right] = 1;
      }

      for (let x = left; x <= right; x++) {
        const idx = (cy * w + x) * 4;
        if (fillType === 'fill-mask') {
          data[idx] = tr;
          data[idx + 1] = tg;
          data[idx + 2] = tb;
          data[idx + 3] = 255;

          // Merge anti-aliased edge pixels into solid mask to prevent halo seams
          if (cy > 0) {
            const uIdx = ((cy - 1) * w + x) * 4;
            if (data[uIdx + 3] > 0 && data[uIdx + 3] < 255) {
              data[uIdx] = tr; data[uIdx + 1] = tg; data[uIdx + 2] = tb; data[uIdx + 3] = 255;
            }
          }
          if (cy < h - 1) {
            const dIdx = ((cy + 1) * w + x) * 4;
            if (data[dIdx + 3] > 0 && data[dIdx + 3] < 255) {
              data[dIdx] = tr; data[dIdx + 1] = tg; data[dIdx + 2] = tb; data[dIdx + 3] = 255;
            }
          }
        } else {
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;

          // Clear faint anti-aliasing on boundary to prevent ghost fringes
          if (cy > 0) {
            const uIdx = ((cy - 1) * w + x) * 4;
            if (data[uIdx + 3] > 0 && data[uIdx + 3] < 64) {
              data[uIdx] = 0; data[uIdx + 1] = 0; data[uIdx + 2] = 0; data[uIdx + 3] = 0;
            }
          }
          if (cy < h - 1) {
            const dIdx = ((cy + 1) * w + x) * 4;
            if (data[dIdx + 3] > 0 && data[dIdx + 3] < 64) {
              data[dIdx] = 0; data[dIdx + 1] = 0; data[dIdx + 2] = 0; data[dIdx + 3] = 0;
            }
          }
        }
      }

      // Check left and right horizontal border pixels
      if (fillType === 'fill-mask') {
        if (left > 0) {
          const lIdx = (cy * w + left - 1) * 4;
          if (data[lIdx + 3] > 0 && data[lIdx + 3] < 255) {
            data[lIdx] = tr; data[lIdx + 1] = tg; data[lIdx + 2] = tb; data[lIdx + 3] = 255;
          }
        }
        if (right < w - 1) {
          const rIdx = (cy * w + right + 1) * 4;
          if (data[rIdx + 3] > 0 && data[rIdx + 3] < 255) {
            data[rIdx] = tr; data[rIdx + 1] = tg; data[rIdx + 2] = tb; data[rIdx + 3] = 255;
          }
        }
      } else {
        if (left > 0) {
          const lIdx = (cy * w + left - 1) * 4;
          if (data[lIdx + 3] > 0 && data[lIdx + 3] < 64) {
            data[lIdx] = 0; data[lIdx + 1] = 0; data[lIdx + 2] = 0; data[lIdx + 3] = 0;
          }
        }
        if (right < w - 1) {
          const rIdx = (cy * w + right + 1) * 4;
          if (data[rIdx + 3] > 0 && data[rIdx + 3] < 64) {
            data[rIdx] = 0; data[rIdx + 1] = 0; data[rIdx + 2] = 0; data[rIdx + 3] = 0;
          }
        }
      }

      // Scan rows above and below
      const scanSpan = (ny) => {
        let inSpan = false;
        for (let x = left; x <= right; x++) {
          if (targetMatch(x, ny) && !visited[ny * w + x]) {
            if (!inSpan) {
              visited[ny * w + x] = 1;
              stack.push([x, ny]);
              inSpan = true;
            }
          } else {
            inSpan = false;
          }
        }
      };

      if (cy > 0) scanSpan(cy - 1);
      if (cy < h - 1) scanSpan(cy + 1);
    }

    this.maskCtx.putImageData(imgData, 0, 0);
    this.setDirty(true);
    this.render();
    this.drawTimeline();
    this.saveCurrentState();
  }

  // --- Zoom & Pan Transforms ---

  zoomAtPoint(mouseX, mouseY, factor) {
    const newZoom = Math.max(0.05, Math.min(50.0, this.zoom * factor));
    const worldX = (mouseX - this.panX) / this.zoom;
    const worldY = (mouseY - this.panY) / this.zoom;

    this.zoom = newZoom;
    this.panX = mouseX - worldX * this.zoom;
    this.panY = mouseY - worldY * this.zoom;

    this.updateZoomDisplay();
    this.render();
  }

  zoomAtCenter(factor) {
    const activeCanvas = this.viewMode === 'side' ? this.sideCanvasLeft : this.mainCanvas;
    const cx = activeCanvas.width / 2;
    const cy = activeCanvas.height / 2;
    this.zoomAtPoint(cx, cy, factor);
  }

  fitToScreen() {
    const activeCanvas = this.viewMode === 'side' ? this.sideCanvasLeft : this.mainCanvas;
    const cw = activeCanvas.width;
    const ch = activeCanvas.height;
    const iw = this.frameImg.naturalWidth || 1920;
    const ih = this.frameImg.naturalHeight || 1080;

    const scale = Math.min((cw - 40) / iw, (ch - 40) / ih);
    this.zoom = Math.max(0.05, scale);
    this.panX = (cw - iw * this.zoom) / 2;
    this.panY = (ch - ih * this.zoom) / 2;

    this.updateZoomDisplay();
    this.render();
  }

  zoom100() {
    const activeCanvas = this.viewMode === 'side' ? this.sideCanvasLeft : this.mainCanvas;
    const cw = activeCanvas.width;
    const ch = activeCanvas.height;
    const iw = this.frameImg.naturalWidth || 1920;
    const ih = this.frameImg.naturalHeight || 1080;

    this.zoom = 1.0;
    this.panX = (cw - iw) / 2;
    this.panY = (ch - ih) / 2;

    this.updateZoomDisplay();
    this.render();
  }

  updateZoomDisplay() {
    this.zoomVal.textContent = `${Math.round(this.zoom * 100)}%`;
  }

  // --- History (Undo / Redo) ---

  recordHistorySnapshot() {
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    if (w === 0 || h === 0) return;

    const snapshot = this.maskCtx.getImageData(0, 0, w, h);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.updateHistoryButtons();
  }

  undo() {
    if (this.undoStack.length <= 1) return;
    const current = this.undoStack.pop();
    this.redoStack.push(current);

    const prev = this.undoStack[this.undoStack.length - 1];
    this.maskCtx.putImageData(prev, 0, 0);
    this.setDirty(true);
    this.render();
    this.updateHistoryButtons();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop();
    this.undoStack.push(next);

    this.maskCtx.putImageData(next, 0, 0);
    this.setDirty(true);
    this.render();
    this.updateHistoryButtons();
  }

  clearHistory() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateHistoryButtons();
  }

  updateHistoryButtons() {
    this.btnUndo.disabled = this.undoStack.length <= 1;
    this.btnRedo.disabled = this.redoStack.length === 0;
  }

  revertEdits() {
    if (!this.isDirty) return;
    if (confirm("Discard all unsaved edits for this frame?")) {
      this.reloadCurrentMask();
      this.setDirty(false);
    }
  }

  // --- Mask Operations & API Actions ---

  async saveFrameSnapshot(sequence, frame, sourceCanvas, showToast = true) {
    if (!frame) return;

    if (showToast) {
      this.saveStatusBadge.textContent = "Saving...";
      this.saveStatusBadge.className = "badge badge-unsaved";
    }

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = w;
    exportCanvas.height = h;
    const expCtx = exportCanvas.getContext('2d');

    const maskData = sourceCanvas.getContext('2d').getImageData(0, 0, w, h).data;
    const outImgData = expCtx.createImageData(w, h);
    const outData = outImgData.data;

    for (let i = 0; i < maskData.length; i += 4) {
      const isMasked = maskData[i + 3] > 64; // Has tint
      const val = this.invertView ? (isMasked ? 255 : 0) : (isMasked ? 0 : 255);
      outData[i] = val;
      outData[i + 1] = val;
      outData[i + 2] = val;
      outData[i + 3] = 255;
    }
    expCtx.putImageData(outImgData, 0, 0);

    const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));

    try {
      const resp = await fetch(`/api/mask/${encodeURIComponent(sequence)}/${encodeURIComponent(frame.filename)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'image/png' },
        body: blob
      });
      if (!resp.ok) throw new Error("Save failed");

      frame.has_mask = true;

      // Only update UI badges if user is still on this sequence and frame
      if (this.currentSequence === sequence && this.frames[this.currentIndex]?.filename === frame.filename) {
        this.maskStatusBadge.textContent = "Mask Present";
        this.maskStatusBadge.className = "badge badge-present";
        if (showToast) {
          this.saveStatusBadge.textContent = "Saved ✓";
          setTimeout(() => {
            if (!this.isDirty) this.saveStatusBadge.textContent = "Saved";
          }, 2000);
        }
      }
      this.updateTimelineStats();
      this.drawTimeline();
      this.saveCurrentState(true);
    } catch (err) {
      console.error("Save error:", err);
      if (this.currentSequence === sequence && this.frames[this.currentIndex]?.filename === frame.filename) {
        this.saveStatusBadge.textContent = "Save Failed";
        alert("Failed to save mask: " + err.message);
      }
    }
  }

  async saveCurrentMask(showToast = true) {
    const frame = this.frames[this.currentIndex];
    if (!frame) return;

    // Synchronously clone mask canvas so future edits or frame switches don't alter this snapshot
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = this.maskCanvas.width;
    snapshotCanvas.height = this.maskCanvas.height;
    snapshotCanvas.getContext('2d').drawImage(this.maskCanvas, 0, 0);

    this.setDirty(false);
    await this.saveFrameSnapshot(this.currentSequence, frame, snapshotCanvas, showToast);
  }

  async deleteCurrentMask() {
    const frame = this.frames[this.currentIndex];
    if (!frame || !frame.has_mask) return;

    if (!confirm(`Delete mask file for ${frame.filename}? (A backup will be moved to .trash)`)) {
      return;
    }

    try {
      const resp = await fetch(`/api/mask/${encodeURIComponent(this.currentSequence)}/${encodeURIComponent(frame.filename)}`, {
        method: 'DELETE'
      });
      if (!resp.ok) throw new Error("Failed to delete mask");

      frame.has_mask = false;
      this.maskCtx.clearRect(0, 0, this.maskCanvas.width, this.maskCanvas.height);
      this.setDirty(false);
      this.maskStatusBadge.textContent = "No Mask";
      this.maskStatusBadge.className = "badge badge-missing";
      this.infoMaskState.textContent = "Deleted";
      this.updateTimelineStats();
      this.drawTimeline();
      this.render();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async clearMask(fillVal) {
    this.recordHistorySnapshot();
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;

    if (fillVal === 255) {
      // Clear to keep: all transparent
      this.maskCtx.clearRect(0, 0, w, h);
    } else {
      // Clear to mask out: all tinted
      this.maskCtx.fillStyle = this.overlayColor;
      this.maskCtx.fillRect(0, 0, w, h);
    }
    this.setDirty(true);
    this.render();
  }

  invertEntireMask() {
    this.recordHistorySnapshot();
    const w = this.maskCanvas.width;
    const h = this.maskCanvas.height;
    const imgData = this.maskCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const { r: tr, g: tg, b: tb } = this.hexToRgb(this.overlayColor);

    for (let i = 0; i < data.length; i += 4) {
      const wasMasked = data[i + 3] > 64;
      if (wasMasked) {
        data[i + 3] = 0; // Become keep
      } else {
        data[i] = tr;
        data[i + 1] = tg;
        data[i + 2] = tb;
        data[i + 3] = 255; // Become mask out
      }
    }
    this.maskCtx.putImageData(imgData, 0, 0);
    this.setDirty(true);
    this.render();
  }

  async copyFromPrev() {
    if (this.currentIndex === 0) {
      alert("This is the first frame.");
      return;
    }
    const prevFrame = this.frames[this.currentIndex - 1];
    const currFrame = this.frames[this.currentIndex];

    try {
      const resp = await fetch(`/api/mask/${encodeURIComponent(this.currentSequence)}/${encodeURIComponent(currFrame.filename)}/copy-from`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src_filename: prevFrame.filename })
      });
      if (!resp.ok) throw new Error("Copy failed");
      currFrame.has_mask = true;
      await this.reloadCurrentMask();
      this.updateTimelineStats();
      this.drawTimeline();
    } catch (err) {
      alert("Error copying mask: " + err.message);
    }
  }

  async copyFromNext() {
    if (this.currentIndex >= this.frames.length - 1) {
      alert("This is the last frame.");
      return;
    }
    const nextFrame = this.frames[this.currentIndex + 1];
    const currFrame = this.frames[this.currentIndex];

    try {
      const resp = await fetch(`/api/mask/${encodeURIComponent(this.currentSequence)}/${encodeURIComponent(currFrame.filename)}/copy-from`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ src_filename: nextFrame.filename })
      });
      if (!resp.ok) throw new Error("Copy failed");
      currFrame.has_mask = true;
      await this.reloadCurrentMask();
      this.updateTimelineStats();
      this.drawTimeline();
    } catch (err) {
      alert("Error copying mask: " + err.message);
    }
  }

  // --- Navigation & Playback ---

  async gotoFrame(index) {
    if (!this.frames || this.frames.length === 0) return;
    if (index < 0) index = 0;
    if (index >= this.frames.length) index = this.frames.length - 1;
    if (index === this.currentIndex) return;

    // Check auto-save before leaving dirty frame
    if (this.isDirty) {
      if (this.autoSave) {
        const oldFrame = this.frames[this.currentIndex];
        const oldSeq = this.currentSequence;
        const snapshot = document.createElement('canvas');
        snapshot.width = this.maskCanvas.width;
        snapshot.height = this.maskCanvas.height;
        snapshot.getContext('2d').drawImage(this.maskCanvas, 0, 0);

        this.setDirty(false);
        // Save in background using its own isolated snapshot canvas
        this.saveFrameSnapshot(oldSeq, oldFrame, snapshot, false);
      } else {
        this.setDirty(false);
      }
    }

    this.currentIndex = index;
    await this.loadCurrentFrame();
    this.saveCurrentState();
  }

  prevFrame() {
    this.gotoFrame(this.currentIndex - 1);
  }

  nextFrame() {
    this.gotoFrame(this.currentIndex + 1);
  }

  findNextMissing() {
    for (let i = this.currentIndex + 1; i < this.frames.length; i++) {
      if (!this.frames[i].has_mask) {
        this.gotoFrame(i);
        return;
      }
    }
    // Wrap around to start
    for (let i = 0; i < this.currentIndex; i++) {
      if (!this.frames[i].has_mask) {
        this.gotoFrame(i);
        return;
      }
    }
    alert("All frames in this sequence have masks!");
  }

  togglePlay() {
    if (this.isPlaying) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  startPlay() {
    this.isPlaying = true;
    this.btnPlay.textContent = '⏸';
    this.btnPlay.title = 'Pause Slideshow (Space)';

    const interval = 1000 / this.fps;
    this.playTimer = setInterval(() => {
      if (this.currentIndex >= this.frames.length - 1) {
        this.gotoFrame(0);
      } else {
        this.nextFrame();
      }
    }, interval);
  }

  stopPlay() {
    this.isPlaying = false;
    this.btnPlay.textContent = '▶';
    this.btnPlay.title = 'Play Slideshow (Space)';
    if (this.playTimer) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  // --- Bottom Timeline Rendering ---

  drawTimeline() {
    const canvas = this.timelineCanvas;
    const ctx = this.timelineCtx;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 8;

    const total = this.frames.length;
    if (total === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barW = Math.max(1, canvas.width / total);

    for (let i = 0; i < total; i++) {
      const f = this.frames[i];
      const x = (i / total) * canvas.width;
      if (f.has_mask) {
        ctx.fillStyle = '#10b981'; // Green: has mask
      } else {
        ctx.fillStyle = '#ef4444'; // Red: missing mask
      }
      ctx.fillRect(x, 0, barW, canvas.height);
    }
  }

  // --- Keyboard Shortcuts ---

  handleKeyDown(e) {
    // If typing in input or select, skip hotkeys
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

    if (e.key === ' ') {
      e.preventDefault();
      this.spacePressed = true;
      const activeCanvas = this.viewMode === 'side' ? this.sideCanvasLeft : this.mainCanvas;
      activeCanvas.style.cursor = 'grab';
      this.cursorIndicator.style.display = 'none';
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        this.isShiftTabHeld = true;
        this.isTabHeld = false;
      } else {
        this.isTabHeld = true;
        this.isShiftTabHeld = false;
      }
      this.render();
      return;
    }

    if (e.key === 'Shift') {
      if (this.isTabHeld) {
        this.isTabHeld = false;
        this.isShiftTabHeld = true;
        this.render();
      }
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      if (!this.isRHeld) {
        this.isRHeld = true;
        this.updateBrushDisplay();
        this.updateBrushCursor();
      }
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        this.redo();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.saveCurrentMask();
        return;
      }
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.prevFrame();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.nextFrame();
        break;
      case '3':
        this.setTool(this.tool === 'fill-out' ? 'brush' : 'fill-out');
        break;
      case '4':
        this.setTool(this.tool === 'fill-in' ? 'brush' : 'fill-in');
        break;
      case 'Escape':
        this.setTool('brush');
        break;
      case 'q':
      case 'Q':
        this.setViewMode('overlay');
        break;
      case 'e':
      case 'E':
        this.setViewMode('mask');
        break;
      case '[':
        this.setBrushSize(Math.max(2, this.brushSize - 5));
        break;
      case ']':
        this.setBrushSize(Math.min(400, this.brushSize + 5));
        break;
      case '0':
      case 'f':
      case 'F':
        this.fitToScreen();
        break;
      case 'c':
      case 'C':
        this.clearMask(255);
        break;
      case 'o':
      case 'O':
        this.setViewMode(this.viewMode === 'overlay' ? 'side' : 'overlay');
        break;
      case 'Escape':
        this.helpModal.classList.add('hidden');
        this.pathModal.classList.add('hidden');
        break;
      case '?':
        this.helpModal.classList.toggle('hidden');
        break;
    }
  }

  handleKeyUp(e) {
    if (e.key === ' ') {
      this.spacePressed = false;
      const activeCanvas = this.viewMode === 'side' ? this.sideCanvasLeft : this.mainCanvas;
      activeCanvas.style.cursor = 'crosshair';
      return;
    }
    if (e.key === 'Tab') {
      this.isTabHeld = false;
      this.isShiftTabHeld = false;
      this.render();
      return;
    }
    if (e.key === 'Shift') {
      if (this.isShiftTabHeld) {
        this.isShiftTabHeld = false;
        this.isTabHeld = true;
        this.render();
      }
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (this.isRHeld) {
        this.isRHeld = false;
        this.updateBrushDisplay();
        this.updateBrushCursor();
      }
      return;
    }
  }

  // --- Helper Methods ---

  setTool(toolName) {
    if (toolName === 'paint-out' || toolName === 'paint-in') {
      toolName = 'brush';
    }
    this.tool = toolName;
    Object.keys(this.toolButtons).forEach(name => {
      if (this.toolButtons[name]) {
        this.toolButtons[name].classList.toggle('active', name === toolName);
      }
    });
    this.updateBrushCursor();
    this.render();
  }

  setBrushSize(size) {
    this.brushSize = size;
    this.brushSizeSlider.value = size;
    this.updateBrushDisplay();
    this.updateBrushCursor();
  }

  setDirty(dirty) {
    this.isDirty = dirty;
    if (dirty) {
      this.saveStatusBadge.textContent = "Unsaved Changes";
      this.saveStatusBadge.className = "badge badge-unsaved";
    } else {
      this.saveStatusBadge.textContent = "Saved";
      this.saveStatusBadge.className = "badge badge-saved";
    }
  }

  showLoading(show, text = "Loading...") {
    if (show) {
      this.loadingText.textContent = text;
      this.loadingSpinner.classList.remove('hidden');
    } else {
      this.loadingSpinner.classList.add('hidden');
    }
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 239, g: 68, b: 68 };
  }
}

// Instantiate application on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  window.app = new MaskStudio();
});
