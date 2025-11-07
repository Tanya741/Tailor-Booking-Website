import React, { useState, useCallback } from 'react';

const ReviewImageUpload = ({ 
  images = [], 
  onImagesChange, 
  maxImages = 5,
  disabled = false 
}) => {
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback((fileList) => {
    const files = Array.from(fileList);
    const validFiles = files.filter(file => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files.');
        return false;
      }
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is 5MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Check total images limit
    const currentCount = images.length;
    const availableSlots = maxImages - currentCount;
    if (availableSlots <= 0) {
      alert(`Maximum of ${maxImages} images allowed.`);
      return;
    }

    const filesToAdd = validFiles.slice(0, availableSlots);
    if (filesToAdd.length < validFiles.length) {
      alert(`Only ${filesToAdd.length} images added due to ${maxImages} image limit.`);
    }

    const newImages = filesToAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      isLocal: true
    }));

    onImagesChange([...images, ...newImages]);
  }, [images, maxImages, onImagesChange]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  const handleInputChange = (e) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const removeImage = (index) => {
    if (disabled) return;
    
    const newImages = [...images];
    const removedImage = newImages.splice(index, 1)[0];
    
    // Clean up object URL for local images
    if (removedImage.isLocal && removedImage.preview) {
      URL.revokeObjectURL(removedImage.preview);
    }
    
    onImagesChange(newImages);
  };

  const getImageUrl = (image) => {
    if (image.isLocal && image.preview) {
      return image.preview;
    }
    if (image.image) {
      return image.image;
    }
    return image.url || image.src || '';
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {!disabled && images.length < maxImages && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="space-y-2">
            <div className="text-gray-600">
              📷 Drop images here or click to select
            </div>
            <div className="text-xs text-gray-500">
              Up to {maxImages} images, max 5MB each (JPEG, PNG, WebP)
            </div>
            <div className="text-xs text-gray-500">
              {images.length} / {maxImages} images added
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={getImageUrl(image)}
                  alt={`Review image ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/placeholder-image.png';
                  }}
                />
                
                {/* Remove Button */}
                {!disabled && (
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>
              
              {/* Local image indicator */}
              {image.isLocal && (
                <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded">
                  New
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length >= maxImages && (
        <div className="text-sm text-gray-500 text-center">
          Maximum of {maxImages} images reached
        </div>
      )}
    </div>
  );
};

export default ReviewImageUpload;