import Component from 'flarum/common/Component';
import icon from 'flarum/common/helpers/icon';
import Tooltip from 'flarum/common/components/Tooltip';
import app from 'flarum/forum/app';
import GalleryModal from './GalleryModal';

export default class GalleryButton extends Component {
  view() {
    return (
      <Tooltip text="Galeri">
        <button 
            // DÜZELTME: 'Button--link' eklendi.
            className="Button Button--icon Button--link hasIcon" 
            type="button"
            onclick={() => app.modal.show(GalleryModal, { editor: this.attrs.editor })}
        >
            {icon('fas fa-images')}
            <span className="Button-label">Galeri</span>
        </button>
      </Tooltip>
    );
  }
}