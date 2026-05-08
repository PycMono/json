// Image Compress — page init (CSP-compliant: no inline scripts allowed)

document.addEventListener('DOMContentLoaded', function() {
  // Back button
  var backBtn = document.querySelector('.ext-topbar__back');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      window.parent.postMessage({action:'go-home'},'*');
    });
  }

  // Drop zone handlers
  var dropZone = document.getElementById('dropZone');
  var fileInput = document.getElementById('fileInput');

  if (dropZone) {
    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', function(e) {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files.length) addFiles(files);
    });
    dropZone.addEventListener('click', function() {
      fileInput.click();
    });
  }

  // Upload button (inside drop zone, stop propagation)
  var uploadBtn = document.querySelector('.ic-btn-upload');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Download all button
  var dlAllBtn = document.getElementById('downloadAllBtn');
  if (dlAllBtn) dlAllBtn.addEventListener('click', downloadAll);

  // Clear all button
  var clearBtn = document.querySelector('.ic-btn-clear-all');
  if (clearBtn) clearBtn.addEventListener('click', clearAll);

  // Expose ICDrop for compatibility (in case other scripts reference it)
  window.ICDrop = {
    over: function(e) { e.preventDefault(); if (dropZone) dropZone.classList.add('drag-over'); },
    leave: function(e) { if (dropZone) dropZone.classList.remove('drag-over'); },
    drop: function(e) {
      e.preventDefault();
      if (dropZone) dropZone.classList.remove('drag-over');
      var files = e.dataTransfer.files;
      if (files && files.length) addFiles(files);
    }
  };
});
