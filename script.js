document.addEventListener('DOMContentLoaded', () => {
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  const logoInput = document.getElementById('logoInput');
  const templateInput = document.getElementById('templateInput');
  const imageCountLabel = document.getElementById('imageCountLabel');
  const logoStatusLabel = document.getElementById('logoStatusLabel');
  const templateStatusLabel = document.getElementById('templateStatusLabel');
  const logoSizeSlider = document.getElementById('logoSize');
  const logoOpacitySlider = document.getElementById('logoOpacity');
  const templateOpacitySlider = document.getElementById('templateOpacity');
  const logoPositionSelect = document.getElementById('logoPosition');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewArea = document.getElementById('previewArea');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const processButton = document.getElementById('processButton');
  const resetButton = document.getElementById('resetButton');
  const progressBar = document.getElementById('progressBar');
  const progressLabel = document.getElementById('progressLabel');
  const postProcessModal = document.getElementById('post-process-modal');
  const progressContainer = document.getElementById('progress-container');
  const postProcessMessage = document.getElementById('post-process-message');
  const btnKeepSettings = document.getElementById('btn-keep-settings');
  const btnResetAfterProcess = document.getElementById('btn-reset-after-process');
  const btnResetLogo = document.getElementById('btn-reset-logo');
  const btnResetTemplate = document.getElementById('btn-reset-template');
  const infoOverlay = document.querySelector('.info-overlay');
  const installButton = document.getElementById('installButton');
  const appShell = document.querySelector('.app-shell');
  const toast = document.getElementById('toast');
  const tabLinks = document.querySelectorAll('.tab-link');
  const tabContents = document.querySelectorAll('.tab-content');

  let imageFiles = [];
  let preloadedLogo = null;
  let preloadedTemplate = null;
  let preloadedBaseImage = null;
  let deferredPrompt = null;

  const SETTINGS_KEY = 'rakaz_app_settings';

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function openTab(tabName) {
    tabLinks.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    tabContents.forEach(tab => tab.classList.toggle('active', tab.id === tabName));
  }

  tabLinks.forEach(btn => {
    btn.addEventListener('click', () => openTab(btn.dataset.tab));
  });

  function safeSaveSettings() {
    try {
      const settings = {
        logoSize: logoSizeSlider.value,
        logoOpacity: logoOpacitySlider.value,
        logoPosition: logoPositionSelect.value,
        templateOpacity: templateOpacitySlider.value,
        imageSizeMode: document.querySelector('input[name="imageSizeMode"]:checked').value
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {}
  }

  function safeLoadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const settings = JSON.parse(raw);
      logoSizeSlider.value = settings.logoSize ?? 15;
      logoOpacitySlider.value = settings.logoOpacity ?? 100;
      logoPositionSelect.value = settings.logoPosition ?? 'Bottom-Right';
      templateOpacitySlider.value = settings.templateOpacity ?? 100;
      const radio = document.querySelector(`input[name="imageSizeMode"][value="${settings.imageSizeMode}"]`);
      if (radio) radio.checked = true;
      document.getElementById('logoSizeValue').textContent = logoSizeSlider.value;
      document.getElementById('logoOpacityValue').textContent = logoOpacitySlider.value;
      document.getElementById('templateOpacityValue').textContent = templateOpacitySlider.value;
    } catch (error) {}
  }

  function loadImageFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function updateLivePreview() {
    if (!preloadedBaseImage) {
      previewCanvas.style.display = 'none';
      previewPlaceholder.style.display = 'block';
      return;
    }

    previewCanvas.style.display = 'block';
    previewPlaceholder.style.display = 'none';

    const ctx = previewCanvas.getContext('2d');
    const containerWidth = previewArea.clientWidth;
    const containerHeight = previewArea.clientHeight;
    previewCanvas.width = containerWidth;
    previewCanvas.height = containerHeight;

    let targetWidth = preloadedBaseImage.width;
    let targetHeight = preloadedBaseImage.height;
    const imageSizeMode = document.querySelector('input[name="imageSizeMode"]:checked').value;

    if (imageSizeMode === 'fit_to_template' && preloadedTemplate) {
      targetWidth = preloadedTemplate.width;
      targetHeight = preloadedTemplate.height;
    }

    const scale = Math.min(containerWidth / targetWidth, containerHeight / targetHeight);
    const drawWidth = targetWidth * scale;
    const drawHeight = targetHeight * scale;
    const x = (containerWidth - drawWidth) / 2;
    const y = (containerHeight - drawHeight) / 2;

    ctx.clearRect(0, 0, containerWidth, containerHeight);
    ctx.drawImage(preloadedBaseImage, x, y, drawWidth, drawHeight);

    if (preloadedTemplate) {
      ctx.globalAlpha = Number(templateOpacitySlider.value) / 100;
      ctx.drawImage(preloadedTemplate, x, y, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
    }

    if (preloadedLogo) {
      const logoScale = Number(logoSizeSlider.value) / 100;
      const logoRatio = preloadedLogo.width / preloadedLogo.height;
      const newWidth = drawWidth * logoScale;
      const newHeight = newWidth / logoRatio;
      const margin = 10;
      const positions = {
        'Top-Left': [x + margin, y + margin],
        'Top-Right': [x + drawWidth - newWidth - margin, y + margin],
        'Bottom-Left': [x + margin, y + drawHeight - newHeight - margin],
        'Bottom-Right': [x + drawWidth - newWidth - margin, y + drawHeight - newHeight - margin],
        'Center': [x + (drawWidth - newWidth) / 2, y + (drawHeight - newHeight) / 2]
      };
      const [logoX, logoY] = positions[logoPositionSelect.value];
      ctx.globalAlpha = Number(logoOpacitySlider.value) / 100;
      ctx.drawImage(preloadedLogo, logoX, logoY, newWidth, newHeight);
      ctx.globalAlpha = 1;
    }
  }

  function drawOnCanvasForProcessing(canvas, baseImage, callback) {
    const imageSizeMode = document.querySelector('input[name="imageSizeMode"]:checked').value;
    let targetWidth = baseImage.width;
    let targetHeight = baseImage.height;

    if (imageSizeMode === 'fit_to_template' && preloadedTemplate) {
      targetWidth = preloadedTemplate.width;
      targetHeight = preloadedTemplate.height;
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImage, 0, 0, targetWidth, targetHeight);

    if (preloadedTemplate) {
      ctx.globalAlpha = Number(templateOpacitySlider.value) / 100;
      ctx.drawImage(preloadedTemplate, 0, 0, targetWidth, targetHeight);
      ctx.globalAlpha = 1;
    }

    if (preloadedLogo) {
      const scale = Number(logoSizeSlider.value) / 100;
      const newWidth = canvas.width * scale;
      const newHeight = preloadedLogo.height * (newWidth / preloadedLogo.width);
      const margin = 25;
      const positions = {
        'Top-Left': [margin, margin],
        'Top-Right': [canvas.width - newWidth - margin, margin],
        'Bottom-Left': [margin, canvas.height - newHeight - margin],
        'Bottom-Right': [canvas.width - newWidth - margin, canvas.height - newHeight - margin],
        'Center': [(canvas.width - newWidth) / 2, (canvas.height - newHeight) / 2]
      };
      const [x, y] = positions[logoPositionSelect.value];
      ctx.globalAlpha = Number(logoOpacitySlider.value) / 100;
      ctx.drawImage(preloadedLogo, x, y, newWidth, newHeight);
      ctx.globalAlpha = 1;
    }

    callback(canvas);
  }

  async function startProcessing() {
    if (imageFiles.length === 0) {
      showToast('الرجاء اختيار صورة واحدة على الأقل.');
      openTab('TabImages');
      return;
    }

    processButton.disabled = true;
    progressContainer.style.display = 'block';
    postProcessMessage.style.display = 'none';
    postProcessModal.style.display = 'flex';
    progressBar.value = 0;
    progressLabel.textContent = '0%';

    const tempCanvas = document.createElement('canvas');

    for (let i = 0; i < imageFiles.length; i += 1) {
      const file = imageFiles[i];
      const baseImage = await loadImageFromFile(file);

      drawOnCanvasForProcessing(tempCanvas, baseImage, canvas => {
        const link = document.createElement('a');
        const fileName = file.name.split('.').slice(0, -1).join('.') || `image-${i + 1}`;
        link.download = `${fileName}_processed.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      });

      const progress = ((i + 1) / imageFiles.length) * 100;
      progressBar.value = progress;
      progressLabel.textContent = `${Math.round(progress)}%`;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    processButton.disabled = false;
    progressContainer.style.display = 'none';
    postProcessMessage.style.display = 'block';
    showToast('تم تجهيز الصور بنجاح.');
  }

  function resetLogo() {
    preloadedLogo = null;
    logoInput.value = '';
    logoStatusLabel.textContent = 'لا يوجد شعار';
    updateLivePreview();
  }

  function resetTemplate() {
    preloadedTemplate = null;
    templateInput.value = '';
    templateStatusLabel.textContent = 'لا يوجد قالب';
    updateLivePreview();
  }

  function resetAll() {
    imageFiles = [];
    imageInput.value = '';
    cameraInput.value = '';
    imageCountLabel.textContent = '0 صورة';
    preloadedBaseImage = null;
    resetLogo();
    resetTemplate();
    logoSizeSlider.value = 15;
    logoOpacitySlider.value = 100;
    logoPositionSelect.value = 'Bottom-Right';
    templateOpacitySlider.value = 100;
    document.querySelector('input[name="imageSizeMode"][value="fit_to_template"]').checked = true;
    document.getElementById('logoSizeValue').textContent = 15;
    document.getElementById('logoOpacityValue').textContent = 100;
    document.getElementById('templateOpacityValue').textContent = 100;
    progressBar.value = 0;
    progressLabel.textContent = '0%';
    try { localStorage.removeItem(SETTINGS_KEY); } catch (error) {}
    updateLivePreview();
    showToast('تمت إعادة ضبط التطبيق.');
  }

  async function setImageFiles(files) {
    imageFiles = Array.from(files || []);
    imageCountLabel.textContent = `${imageFiles.length} صورة`;

    if (imageFiles.length > 0) {
      preloadedBaseImage = await loadImageFromFile(imageFiles[0]);
      updateLivePreview();
      showToast(`تم تحميل ${imageFiles.length} صورة.`);
    } else {
      preloadedBaseImage = null;
      updateLivePreview();
    }
  }

  imageInput.addEventListener('change', async e => {
    await setImageFiles(e.target.files);
  });

  cameraInput.addEventListener('change', async e => {
    await setImageFiles(e.target.files);
  });

  logoInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) {
      resetLogo();
      return;
    }
    preloadedLogo = await loadImageFromFile(file);
    logoStatusLabel.textContent = '✔ تم اختيار الشعار';
    updateLivePreview();
  });

  templateInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) {
      resetTemplate();
      return;
    }
    preloadedTemplate = await loadImageFromFile(file);
    templateStatusLabel.textContent = '✔ تم اختيار القالب';
    updateLivePreview();
  });

  document.querySelectorAll('input[type="range"], select, input[type="radio"]').forEach(control => {
    control.addEventListener('input', () => {
      if (control.type === 'range') {
        const label = document.getElementById(`${control.id}Value`);
        if (label) label.textContent = control.value;
      }
      updateLivePreview();
      safeSaveSettings();
    });
  });

  processButton.addEventListener('click', startProcessing);
  resetButton.addEventListener('click', resetAll);
  btnResetLogo.addEventListener('click', resetLogo);
  btnResetTemplate.addEventListener('click', resetTemplate);
  btnKeepSettings.addEventListener('click', () => {
    postProcessModal.style.display = 'none';
  });
  btnResetAfterProcess.addEventListener('click', () => {
    resetAll();
    postProcessModal.style.display = 'none';
  });

  window.addEventListener('resize', updateLivePreview);

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.hidden = false;
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }

  const splashScreen = document.getElementById('splash-screen');
  setTimeout(() => splashScreen.classList.add('hidden'), 1800);
  setTimeout(() => {
    splashScreen.style.display = 'none';
    appShell.classList.remove('hidden-until-ready');
    appShell.style.visibility = 'visible';
    if (infoOverlay) infoOverlay.style.display = 'block';
    updateLivePreview();
  }, 2200);

  safeLoadSettings();
  openTab('TabImages');
});