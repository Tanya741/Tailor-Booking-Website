# 🌤️ Cloudinary Integration Guide

This guide explains how to set up external storage with Cloudinary for your Render deployment.

## Why Use External Storage?

Render's free tier uses ephemeral storage, meaning uploaded files are deleted when your service restarts. Cloudinary provides:
- ✅ Persistent file storage
- ✅ Free tier (25GB storage, 25GB bandwidth)
- ✅ Automatic image optimization
- ✅ CDN delivery worldwide
- ✅ Image transformations

## Setup Steps

### 1. Create Cloudinary Account
1. Go to https://cloudinary.com/
2. Sign up for a free account
3. Note down your credentials from the dashboard:
   - Cloud Name
   - API Key
   - API Secret

### 2. Configure Environment Variables in Render

In your Render backend service dashboard:

1. Go to **Environment** tab
2. Add these variables:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   USE_CLOUDINARY=True
   ```

### 3. Deploy Updated Code
1. Push your changes to GitHub
2. Render will automatically redeploy
3. Your images will now be stored in Cloudinary

## How It Works

### Development vs Production
- **Development** (`USE_CLOUDINARY=False`): Uses local file storage
- **Production** (`USE_CLOUDINARY=True`): Uses Cloudinary storage

### Automatic Switching
The app automatically detects the environment and switches storage backends:
```python
if USE_CLOUDINARY:
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
else:
    # Use local storage
```

### Image URLs
- **Local**: `http://localhost:8000/media/images/photo.jpg`
- **Cloudinary**: `https://res.cloudinary.com/your-cloud/image/upload/v1234567/photo.jpg`

## Testing

1. Upload an image through your app
2. Check the image URL in the response
3. Verify the image loads correctly
4. Images should persist after Render service restarts

## Benefits

✅ **No Code Changes Needed**: Existing upload logic works unchanged
✅ **Automatic Optimization**: Cloudinary optimizes images automatically
✅ **Fast Loading**: Global CDN ensures fast image delivery
✅ **Scalable**: Handle thousands of images without storage limits
✅ **Cost Effective**: Free tier covers most small to medium apps

## Troubleshooting

### Image Not Uploading
- Check Cloudinary credentials in Render environment variables
- Verify `USE_CLOUDINARY=True` in production
- Check application logs for error messages

### Images Not Loading
- Verify image URLs point to Cloudinary domain
- Check browser network tab for failed requests
- Ensure Cloudinary API limits aren't exceeded

### Environment Variables
Make sure all required variables are set in Render:
```bash
# Required for Cloudinary
CLOUDINARY_CLOUD_NAME=your-value
CLOUDINARY_API_KEY=your-value
CLOUDINARY_API_SECRET=your-value
USE_CLOUDINARY=True

# Other required variables
SECRET_KEY=your-secret
DATABASE_URL=postgresql://...
DEBUG=False
```

## Next Steps

After setup:
1. Test image uploads in production
2. Monitor Cloudinary usage in dashboard
3. Consider upgrading plan if you exceed free limits
4. Explore Cloudinary's image transformation features

Your Render deployment will now have persistent image storage! 🎉