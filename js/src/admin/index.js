import app from 'flarum/admin/app';
import FramioSettingsPage from './components/FramioSettingsPage';

app.initializers.add('framio-upload-exif', () => {
  app.extensionData
    .for('framio-upload-exif')
    .registerPage(FramioSettingsPage);
});