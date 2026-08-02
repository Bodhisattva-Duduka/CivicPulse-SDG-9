import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, MapPin, Loader, CheckCircle, AlertCircle, Upload, X, Image as ImageIcon, Navigation } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../lib/api';
import { CATEGORY_LABELS } from '../lib/constants';

// Fix Leaflet marker default icon URL issue
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function MapClickHandler({ onLocationChange }) {
  useMapEvents({
    click(e) {
      onLocationChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.lat && center?.lng) {
      map.setView([center.lat, center.lng], 16);
    }
  }, [center, map]);
  return null;
}

export default function ReportPage() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [step, setStep] = useState('photo'); // photo → camera → location → submit → result
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationSource, setLocationSource] = useState('');
  const [locationError, setLocationError] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');

  // Cleanup webcam stream on unmount
  useEffect(() => {
    return () => stopCamera();
  }, []);

  const requestBrowserLocation = (force = false) => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. Click on the map to set location.');
      return;
    }

    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        setLocationSource(force ? 'Browser GPS (refreshed)' : 'Browser GPS');
      },
      (err) => {
        console.error('Geolocation error:', err);
        setLocationError('Unable to get GPS automatically. Tap anywhere on the map to place your pin manually.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Get browser location on mount
  useEffect(() => {
    requestBrowserLocation(false);
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const openCamera = async () => {
    setCameraError('');
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      setStep('camera');
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions and try again.'
        : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : `Camera error: ${err.message}`);
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    stopCamera();

    canvas.toBlob(async (blob) => {
      if (!blob) { setError('Failed to capture photo'); return; }
      try {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        let processedPhoto = file;
        try {
          processedPhoto = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: false,
            preserveExif: true
          });
        } catch (cErr) {
          console.warn('Compression bypassed for camera capture:', cErr);
        }
        setPhoto(processedPhoto);
        setPreview(URL.createObjectURL(processedPhoto));

        if (!location) {
          requestBrowserLocation(false);
        }
        setStep('location');
      } catch (err) {
        console.error('Camera capture error:', err);
        setError('Failed to process captured photo.');
      }
    }, 'image/jpeg', 0.92);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError('');

      // Step A: Extract EXIF GPS metadata from raw image file if available
      let extractedGps = null;
      try {
        const gps = await exifr.gps(file);
        if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
          extractedGps = { lat: gps.latitude, lng: gps.longitude };
        }
      } catch (exifErr) {
        console.log('No EXIF GPS metadata found in photo file:', exifErr);
      }

      if (extractedGps) {
        setLocation(extractedGps);
        setLocationSource('Photo EXIF metadata');
      } else if (!location) {
        requestBrowserLocation(false);
      }

      // Step B: Compress image if possible, or fall back to original file
      let processedPhoto = file;
      try {
        processedPhoto = await imageCompression(file, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: false,
          preserveExif: true
        });
      } catch (compressErr) {
        console.warn('Image compression bypassed, using original photo:', compressErr);
        processedPhoto = file;
      }

      setPhoto(processedPhoto);
      setPreview(URL.createObjectURL(processedPhoto));
      setStep('location');
    } catch (err) {
      console.error('Photo select error:', err);
      // Fallback: set photo directly so user is never blocked
      setPhoto(file);
      setPreview(URL.createObjectURL(file));
      setStep('location');
    }
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error('Cloudinary configuration missing');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Cloudinary upload failed (${res.status}): ${JSON.stringify(errData)}`);
    }
    return res.json();
  };

  const handleSubmit = async () => {
    if (!photo || !location) return;

    setSubmitting(true);
    setError('');

    try {
      // Step 1: Upload to Cloudinary
      setUploading(true);
      const cloudRes = await uploadToCloudinary(photo);
      setUploading(false);

      // Step 2: Create complaint
      const res = await api.post('/complaints', {
        photoUrl: cloudRes.secure_url,
        photoPublicId: cloudRes.public_id,
        lat: location.lat,
        lng: location.lng,
        description: description.trim() || undefined
      });

      setResult(res.data);
      setStep('result');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit report');
      setUploading(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      padding: '32px 24px'
    }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '8px' }}>Report an issue</h1>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '28px' }}>
          Photograph a civic problem. AI will classify and route it automatically.
        </p>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(229, 72, 77, 0.1)',
            border: '1px solid rgba(229, 72, 77, 0.3)',
            color: 'var(--color-status-overdue)',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && result && (
          <div className="animate-fade-in" style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '28px',
            textAlign: 'center'
          }}>
            <CheckCircle size={48} color={result.matched ? 'var(--color-status-acknowledged)' : 'var(--color-status-resolved)'} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '16px' }}>
              {result.matched ? "You've confirmed an existing report" : 'Report created successfully'}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '8px 0 4px' }}>
              {result.matched
                ? 'Your report matched an existing issue. Your confirmation helps prioritize it.'
                : 'Your report has been classified and routed to the relevant department.'}
            </p>
            {result.complaint && (
              <div style={{
                margin: '16px 0',
                padding: '12px',
                backgroundColor: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px'
              }}>
                <div>Category: <strong>{CATEGORY_LABELS[result.complaint.category]}</strong></div>
                <div>Severity: <strong>{result.complaint.severity}</strong></div>
                <div>Department: <strong>{result.complaint.department}</strong></div>
                {result.complaint.aiConfidence != null && (
                  <div>AI Confidence: <strong>{Math.round(result.complaint.aiConfidence * 100)}%</strong></div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={() => navigate(`/complaints/${result.complaint._id}`)}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer'
                }}
              >
                View report
              </button>
              <button
                onClick={() => {
                  setStep('photo');
                  setPhoto(null);
                  setPreview(null);
                  setDescription('');
                  setResult(null);
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  backgroundColor: 'var(--color-accent)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer'
                }}
              >
                Report another
              </button>
            </div>
          </div>
        )}

        {/* PHOTO STEP — choose camera or gallery */}
        {step === 'photo' && (
          <div className="animate-fade-in">
            {/* Hidden file input for GALLERY */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
              id="photo-input-gallery"
            />
            {/* Hidden canvas for webcam capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {cameraError && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(229, 72, 77, 0.1)',
                border: '1px solid rgba(229, 72, 77, 0.3)',
                color: 'var(--color-status-overdue)', fontSize: '13px', marginBottom: '16px'
              }}>
                <AlertCircle size={16} />{cameraError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Camera option — opens real webcam */}
              <div
                onClick={openCamera}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  backgroundColor: 'var(--color-bg-card)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'; }}
              >
                <Camera size={36} color="var(--color-accent)" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Open camera</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Take a photo now</p>
              </div>

              {/* Gallery option */}
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '40px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  backgroundColor: 'var(--color-bg-card)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'; }}
              >
                <ImageIcon size={36} color="var(--color-accent)" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Choose from gallery</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Pick an existing photo</p>
              </div>
            </div>
          </div>
        )}

        {/* LIVE CAMERA STEP — webcam viewfinder */}
        {step === 'camera' && (
          <div className="animate-fade-in">
            <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)', backgroundColor: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'cover' }}
              />
              {/* Close camera */}
              <button
                onClick={() => { stopCamera(); setStep('photo'); }}
                style={{
                  position: 'absolute', top: '10px', right: '10px',
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: 'none', backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#FFF', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>
            </div>
            {/* Shutter button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
              <button
                onClick={capturePhoto}
                style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  border: '4px solid var(--color-accent)',
                  backgroundColor: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', transition: 'transform 0.15s' }} />
              </button>
            </div>
            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              Point at the issue and tap the shutter button to capture
            </p>
            {/* Hidden canvas for capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {/* LOCATION + DESCRIPTION + SUBMIT STEP */}
        {step === 'location' && (
          <div className="animate-fade-in">
            {/* Photo preview */}
            <div style={{ position: 'relative', marginBottom: '20px' }}>
              <img
                src={preview}
                alt="Report photo"
                style={{
                  width: '100%',
                  maxHeight: '300px',
                  objectFit: 'cover',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-border)'
                }}
              />
              <button
                onClick={() => { setStep('photo'); setPhoto(null); setPreview(null); }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#FFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Location Header & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={18} color={location ? 'var(--color-status-resolved)' : 'var(--color-status-overdue)'} />
                  <div>
                    {location ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                          {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          Source: {locationSource || 'Browser GPS'} (Click map to move pin)
                        </div>
                      </>
                    ) : (
                      <span style={{ fontSize: '13px', color: locationError ? 'var(--color-status-overdue)' : 'var(--color-text-muted)' }}>
                        {locationError || 'Acquiring location... Click map to place pin manually.'}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requestBrowserLocation(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '6px 10px', fontSize: '11px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                    fontWeight: 500
                  }}
                >
                  <Navigation size={12} />
                  Re-detect GPS
                </button>
              </div>

              {/* Interactive Map Picker */}
              <div style={{ height: '220px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <MapContainer
                  center={location ? [location.lat, location.lng] : [17.385, 78.4867]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                  <MapClickHandler onLocationChange={(newLoc) => {
                    setLocation(newLoc);
                    setLocationSource('Manually pinned on map');
                  }} />
                  {location && (
                    <>
                      <RecenterMap center={location} />
                      <Marker
                        position={[location.lat, location.lng]}
                        icon={defaultIcon}
                        draggable={true}
                        eventHandlers={{
                          dragend(e) {
                            const marker = e.target;
                            const pos = marker.getLatLng();
                            setLocation({ lat: pos.lat, lng: pos.lng });
                            setLocationSource('Manually pinned on map');
                          }
                        }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-dimmed)', margin: '2px 0 0', textAlign: 'center' }}>
                💡 Click anywhere on the map or drag the marker to set your exact issue location.
              </p>
            </div>

            {/* Description */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '6px',
                color: 'var(--color-text-muted)'
              }}>
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional details about the issue..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-input)',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'var(--font-sans)',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!location || submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                backgroundColor: 'var(--color-accent)',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                cursor: (!location || submitting) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: (!location || submitting) ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {submitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  {uploading ? 'Uploading photo...' : 'Classifying with AI...'}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Submit report
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
