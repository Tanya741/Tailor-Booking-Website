import React, { useState, useRef } from 'react';

export default function MultiImageUpload({ 
  images = [], 
  onImagesAdd, 
  onImageRemove,
  maxImages = 10,
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  className = '',
  disabled = false
}) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFiles = (files) => {
    setError('');
    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: Please upload a JPEG, PNG, or WebP image.`);
        continue;
      }
      
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (images.length + validFiles.length > maxImages) {
      errors.push(`Maximum ${maxImages} images allowed. You can add ${maxImages - images.length} more.`);
      return [];
    }

    if (errors.length > 0) {
      setError(errors.join(' '));
      return [];
    }

    return validFiles;
  };

  const handleFilesSelect = (fileList) => {
    const files = Array.from(fileList);
    const validFiles = validateFiles(files);
    if (validFiles.length > 0) {
      onImagesAdd(validFiles);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files?.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFilesSelect(files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleClick = () => {
    if (!disabled && images.length < maxImages) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (index) => {
    setError('');
    onImageRemove(index);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-gray-50'}
          `}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="py-4">
            <div className="mx-auto w-12 h-12 text-gray-400 mb-2">
              📷
            </div>
            <p className="text-sm text-gray-600 mb-1">
              Click to add images or drag and drop
            </p>
            <p className="text-xs text-gray-400">
              {maxImages - images.length} more images allowed • JPEG, PNG, WebP up to {Math.round(maxSize / (1024 * 1024))}MB each
            </p>
          </div>
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img 
                  src={typeof image === 'string' ? image : 
                       image.isLocal ? (image.preview || URL.createObjectURL(image.file)) :
                       image.image ? image.image : 
                       URL.createObjectURL(image)}
                  alt={`Service image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Controls overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
              
              {/* Image order indicator */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Images Counter */}
      {images.length > 0 && (
        <p className="text-sm text-gray-500 text-center">
          {images.length} of {maxImages} images
        </p>
      )}
    </div>
  );
}