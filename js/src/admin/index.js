import app from 'flarum/admin/app';
import FramioSettingsPage from './components/FramioSettingsPage';

app.initializers.add('framiodev-upload-exif', () => {
  app.extensionData
    .for('framiodev-upload-exif')
    .registerPage(FramioSettingsPage);
});