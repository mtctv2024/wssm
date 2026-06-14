document.addEventListener('DOMContentLoaded', function () {
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

  let imageFiles = [];
  let preloadedLogo = null;
  let preloadedTemplate = null;
  let preloadedBaseImage = null;

  window.openTab = function (evt, tabName) {
    const tabcontent = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = 'none';
    }

    const tablinks = document.getElementsByClassName('tab-link');
    for (let i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(' active', '');
    }

    document.getElementById(tabName).style.display = 'block';
    evt.currentTarget.className += ' active';
  };

  function updateValueLabels() {
    document.getElementById('logoSizeValue').textContent = logoSizeSlider.value;
    document.getElementById('logoOpacityValue').textContent = logoOpacitySlider.value;
    document.getElementById('templateOpacityValue').textContent = templateOpacitySlider.value;
  }

  function fileToImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          resolve(img);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  window.updateLivePreview = function () {
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
      ctx.globalAlpha = templateOpacitySlider.value / 100;
      ctx.drawImage(preloadedTemplate, x, y, drawWidth, drawHeight);
      ctx.globalAlpha = 1;
    }

    if (preloadedLogo) {
      const logoScale = logoSizeSlider.value / 100;
      const logoRatio = preloadedLogo.width / preloadedLogo.height;
      const newW = drawWidth * logoScale;
      const newH = newW / logoRatio;
      const margin = 10;

      const positions = {
        'Top-Left': [x + margin, y + margin],
        'Top-Right': [x + drawWidth - newW - margin, y + margin],
        'Bottom-Left': [x + margin, y + drawHeight - newH - margin],
        'Bottom-Right': [x + drawWidth - newW - margin, y + drawHeight - newH - margin],
        'Center': [x + (drawWidth - newW) / 2, y + (drawHeight - newH) / 2]
      };

      const [logoX, logoY] = positions[logoPositionSelect.value];
      ctx.globalAlpha = logoOpacitySlider.value / 100;
      ctx.drawImage(preloadedLogo, logoX, logoY, newW, newH);
      ctx.globalAlpha = 1;
    }
  };

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
    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(baseImage, 0, 0, targetWidth, targetHeight);

    if (preloadedTemplate) {
      ctx.globalAlpha = templateOpacitySlider.value / 100;
      ctx.drawImage(preloadedTemplate, 0, 0, targetWidth, targetHeight);
      ctx.globalAlpha = 1;
    }

    if (preloadedLogo) {
      const scale = logoSizeSlider.value / 100;
      const newW = canvas.width * scale;
      const newH = preloadedLogo.height * (newW / preloadedLogo.width);
      const margin = 25;

      const positions = {
        'Top-Left': [margin, margin],
        'Top-Right': [canvas.width - newW - margin, margin],
        'Bottom-Left': [margin, canvas.height - newH - margin],
        'Bottom-Right': [canvas.width - newW - margin, canvas.height - newH - margin],
        'Center': [(canvas.width - newW) / 2, (canvas.height - newH) / 2]
      };

      const [x, y] = positions[logoPositionSelect.value];
      ctx.globalAlpha = logoOpacitySlider.value / 100;
      ctx.drawImage(preloadedLogo, x, y, newW, newH);
      ctx.globalAlpha = 1;
    }

    callback(canvas);
  }

  async function startProcessing() {
    if (imageFiles.length === 0) {
      alert('الرجاء اختيار مجموعة صور أولاً.');
      return;
    }

    processButton.disabled = true;
    if (progressContainer) progressContainer.style.display = 'block';
    if (postProcessMessage) postProcessMessage.style.display = 'none';
    if (progressBar) progressBar.value = 0;
    if (progressLabel) progressLabel.textContent = '0%';
    postProcessModal.style.display = 'flex';

    const tempCanvas = document.createElement('canvas');

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const baseImage = await fileToImage(file);

      await new Promise((resolve) => {
        drawOnCanvasForProcessing(tempCanvas, baseImage, function (canvas) {
          const fileName = file.name.split('.').slice(0, -1).join('.') || `image-${i + 1}`;

          canvas.toBlob(function (blob) {
            if (!blob) {
              resolve();
              return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `${fileName}_processed.jpg`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(function () {
              URL.revokeObjectURL(url);
              resolve();
            }, 300);
          }, 'image/jpeg', 0.95);
        });
      });

      const progress = ((i + 1) / imageFiles.length) * 100;
      if (progressBar) progressBar.value = progress;
      if (progressLabel) progressLabel.textContent = `${Math.round(progress)}%`;
    }

    processButton.disabled = false;
    if (progressContainer) progressContainer.style.display = 'none';
    if (postProcessMessage) postProcessMessage.style.display = 'block';
  }

  function saveSettings() {
    const settings = {
      logoSize: logoSizeSlider.value,
      logoOpacity: logoOpacitySlider.value,
      logoPosition: logoPositionSelect.value,
      templateOpacity: templateOpacitySlider.value,
      imageSizeMode: document.querySelector('input[name="imageSizeMode"]:checked').value
    };
    localStorage.setItem('rakaz_app_settings', JSON.stringify(settings));
  }

  function loadSettings() {
    const savedSettings = localStorage.getItem('rakaz_app_settings');
    if (!savedSettings) return;

    const settings = JSON.parse(savedSettings);
    logoSizeSlider.value = settings.logoSize || 15;
    logoOpacitySlider.value = settings.logoOpacity || 100;
    logoPositionSelect.value = settings.logoPosition || 'Bottom-Right';
    templateOpacitySlider.value = settings.templateOpacity || 100;

    const selectedMode = document.querySelector(`input[name="imageSizeMode"][value="${settings.imageSizeMode}"]`);
    if (selectedMode) selectedMode.checked = true;

    updateValueLabels();
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

    updateValueLabels();

    progressBar.value = 0;
    progressLabel.textContent = '0%';
    localStorage.removeItem('rakaz_app_settings');
    updateLivePreview();
    alert('تمت إعادة ضبط التطبيق إلى الإعدادات الافتراضية.');
  }

  async function handleSelectedFiles(fileList) {
    imageFiles = Array.from(fileList || []);
    imageCountLabel.textContent = `${imageFiles.length} صورة`;

    if (imageFiles.length > 0) {
      preloadedBaseImage = await fileToImage(imageFiles[0]);
    } else {
      preloadedBaseImage = null;
    }

    updateLivePreview();
  }

  imageInput.addEventListener('change', async function (e) {
    await handleSelectedFiles(e.target.files);
  });

  cameraInput.addEventListener('change', async function (e) {
    await handleSelectedFiles(e.target.files);
  });

  logoInput.addEventListener('change', async function (e) {
    const logoFile = e.target.files[0];
    logoStatusLabel.textContent = logoFile ? '✔ تم اختيار الشعار' : 'لا يوجد شعار';

    if (logoFile) {
      preloadedLogo = await fileToImage(logoFile);
    } else {
      preloadedLogo = null;
    }

    updateLivePreview();
  });

  templateInput.addEventListener('change', async function (e) {
    const templateFile = e.target.files[0];
    templateStatusLabel.textContent = templateFile ? '✔ تم اختيار القالب' : 'لا يوجد قالب';

    if (templateFile) {
      preloadedTemplate = await fileToImage(templateFile);
    } else {
      preloadedTemplate = null;
    }

    updateLivePreview();
  });

  document.querySelectorAll('input[type="range"], select, input[type="radio"]').forEach(function (el) {
    el.addEventListener('input', function () {
      updateValueLabels();
      updateLivePreview();
      saveSettings();
    });
  });

  processButton.addEventListener('click', startProcessing);
  resetButton.addEventListener('click', resetAll);

  if (btnResetLogo) btnResetLogo.addEventListener('click', resetLogo);
  if (btnResetTemplate) btnResetTemplate.addEventListener('click', resetTemplate);

  btnKeepSettings.addEventListener('click', function () {
    postProcessModal.style.display = 'none';
  });

  btnResetAfterProcess.addEventListener('click', function () {
    resetAll();
    postProcessModal.style.display = 'none';
  });

  window.addEventListener('resize', updateLivePreview);

  const splashScreen = document.getElementById('splash-screen');
  const mainContainer = document.querySelector('.main-container');

  setTimeout(function () {
    splashScreen.style.opacity = '0';
  }, 2000);

  setTimeout(function () {
    splashScreen.style.display = 'none';
    mainContainer.style.display = 'flex';
    updateLivePreview();
  }, 2500);

  updateValueLabels();
  loadSettings();
});