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
  const resultsContainer = document.getElementById('results-container');
  const resultsList = document.getElementById('resultsList');
  const progressBarModal = document.getElementById('progressBarModal');
  const progressLabelModal = document.getElementById('progressLabelModal');

  let imageFiles = [];
  let preloadedLogo = null;
  let preloadedTemplate = null;
  let preloadedBaseImage = null;
  let generatedObjectUrls = [];

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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          resolve(img);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
  }

  function isAndroid() {
    return /Android/i.test(navigator.userAgent);
  }

  function clearGeneratedUrls() {
    generatedObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    generatedObjectUrls = [];
  }

  function prepareResultsUI() {
    resultsList.innerHTML = '';
    resultsContainer.style.display = 'none';
  }

  function updateProgress(value) {
    const rounded = Math.round(value);
    if (progressBar) progressBar.value = value;
    if (progressLabel) progressLabel.textContent = `${rounded}%`;
    if (progressBarModal) progressBarModal.value = value;
    if (progressLabelModal) progressLabelModal.textContent = `${rounded}%`;
  }

  function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.95) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  function createObjectUrl(blob) {
    const url = URL.createObjectURL(blob);
    generatedObjectUrls.push(url);
    return url;
  }

  function addResultItem({ fileName, url, previewUrl, note }) {
    const li = document.createElement('li');

    const name = document.createElement('div');
    name.className = 'result-name';
    name.textContent = fileName;
    li.appendChild(name);

    const img = document.createElement('img');
    img.src = previewUrl;
    img.alt = fileName;
    img.className = 'result-preview';
    li.appendChild(img);

    const noteEl = document.createElement('div');
    noteEl.className = 'result-note';
    noteEl.textContent = note;
    li.appendChild(noteEl);

    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const downloadBtn = document.createElement('a');
    downloadBtn.href = url;
    downloadBtn.download = fileName;
    downloadBtn.className = 'btn btn-small btn-download';
    downloadBtn.textContent = 'تنزيل الصورة';
    actions.appendChild(downloadBtn);

    li.appendChild(actions);
    resultsList.appendChild(li);
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

  function drawOnCanvasForProcessing(canvas, baseImage) {
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

    return canvas;
  }

  async function startProcessing() {
    if (imageFiles.length === 0) {
      alert('الرجاء اختيار مجموعة صور أولاً.');
      return;
    }

    clearGeneratedUrls();
    prepareResultsUI();

    processButton.disabled = true;
    if (progressContainer) progressContainer.style.display = 'block';
    if (postProcessMessage) postProcessMessage.style.display = 'none';
    updateProgress(0);
    postProcessModal.style.display = 'flex';

    const tempCanvas = document.createElement('canvas');

    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const baseImage = await fileToImage(file);
        const fileNameBase = file.name.split('.').slice(0, -1).join('.') || `image-${i + 1}`;
        const finalFileName = `${fileNameBase}_processed.jpg`;

        const canvas = drawOnCanvasForProcessing(tempCanvas, baseImage);
        const blob = await canvasToBlob(canvas, 'image/jpeg', 0.95);

        if (!blob) {
          throw new Error('تعذر إنشاء ملف الصورة النهائي.');
        }

        const objectUrl = createObjectUrl(blob);

        let note = 'يمكنك معاينة الصورة هنا ثم استخدام زر التنزيل.';
        if (isIOS()) {
          note = 'على الآيفون والآيباد: اضغط مطولًا على الصورة لحفظها، أو جرّب زر التنزيل إن دعمه المتصفح.';
        } else if (isAndroid()) {
          note = 'على أندرويد: يمكنك حفظ الصورة من زر التنزيل، ويمكنك أيضًا الضغط المطول على المعاينة حسب المتصفح.';
        }

        addResultItem({
          fileName: finalFileName,
          url: objectUrl,
          previewUrl: objectUrl,
          note
        });

        const progress = ((i + 1) / imageFiles.length) * 100;
        updateProgress(progress);
      }

      if (progressContainer) progressContainer.style.display = 'none';
      if (resultsContainer) resultsContainer.style.display = 'block';

      if (postProcessMessage) {
        postProcessMessage.style.display = 'block';
        postProcessMessage.textContent = 'تم تجهيز الصور بنجاح داخل التطبيق.';
      }
    } catch (error) {
      console.error(error);
      if (progressContainer) progressContainer.style.display = 'none';
      if (postProcessMessage) {
        postProcessMessage.style.display = 'block';
        postProcessMessage.textContent = 'حدثت مشكلة أثناء معالجة الصور.';
      }
      alert('حدثت مشكلة أثناء معالجة الصور.');
    } finally {
      processButton.disabled = false;
    }
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
    clearGeneratedUrls();
    prepareResultsUI();

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
    updateProgress(0);
    localStorage.removeItem('rakaz_app_settings');
    updateLivePreview();
    alert('تمت إعادة ضبط التطبيق إلى الإعدادات الافتراضية.');
  }

  async function handleSelectedFiles(fileList, replace = true) {
    const files = Array.from(fileList || []);
    if (replace) {
      imageFiles = files;
    } else {
      imageFiles = imageFiles.concat(files);
    }

    imageCountLabel.textContent = `${imageFiles.length} صورة`;

    if (imageFiles.length > 0) {
      preloadedBaseImage = await fileToImage(imageFiles[0]);
    } else {
      preloadedBaseImage = null;
    }

    updateLivePreview();
  }

  imageInput.addEventListener('change', async function (e) {
    await handleSelectedFiles(e.target.files, true);
  });

  cameraInput.addEventListener('change', async function (e) {
    await handleSelectedFiles(e.target.files, false);
    cameraInput.value = '';
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