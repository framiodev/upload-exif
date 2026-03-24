import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/forum/app';

export default class GalleryModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.loading = true;
    this.images = [];
    this.editor = this.attrs.editor;
    this.loadImages();
  }

  className() { return 'GalleryModal Modal--large'; }
  title() { return 'Medyalarım'; }

  loadImages() {
    this.loading = true;
    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/framio-images/user'
    }).then(response => {
      this.images = response.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      
      this.loading = false;
      m.redraw();
    });
  }

  deleteImage(img, e) {
    e.preventDefault(); 
    e.stopPropagation(); 
    
    if (!confirm('Bu fotoğrafı kalıcı olarak silmek istiyor musunuz?')) return;
    
    app.request({
      method: 'DELETE',
      url: app.forum.attribute('apiUrl') + '/framio-image/' + img.id
    }).then(() => {
      this.images = this.images.filter(i => i.id !== img.id);
      m.redraw();
    });
  }

  copyLink(img, e) {
    e.preventDefault(); 
    e.stopPropagation();
    const bbcode = `[framio-image id=${img.id} url=${img.thumb_path} alt=${img.filename}]`;
    
    navigator.clipboard.writeText(bbcode).then(() => {
        app.alerts.show({ type: 'success' }, 'BBCode kopyalandı!');
    });
  }

  insertImage(img) {
    let altText = img.filename.split('.').slice(0, -1).join('.');
    altText = altText.replace(/[-_]/g, ' ');

    const bbcode = `[framio-image id=${img.id} url=${img.thumb_path} alt=${altText}]`;
    this.editor.insertAtCursor(bbcode + '\n');
    this.hide();
  }

  content() {
    return (
      <div className="Modal-body">
        {this.loading ? (
           <LoadingIndicator />
        ) : this.images.length === 0 ? (
           <div className="Gallery-empty">
               <i className="fas fa-camera-retro" style="font-size:48px; margin-bottom:20px; opacity:0.5"></i><br/>
               Henüz hiç fotoğraf yüklemediniz.
           </div>
        ) : (
           <div className="Gallery-grid">
              {this.images.map(img => (
                  <div className="Gallery-item" onclick={() => this.insertImage(img)}>
                      <div className="Gallery-image-wrapper">
                          <img
                              src={img.mini_url || img.thumb_path}
                              alt={img.filename}
                              loading="lazy"
                              onerror={(e) => { e.target.onerror = null; e.target.src = img.thumb_path; }}
                          />
                      </div>
                      <div className="Gallery-actions">
                          <button className="Button Button--icon Button--danger"
                                  type="button" 
                                  onclick={(e) => this.deleteImage(img, e)}
                                  title="Sil">
                              <i className="fas fa-trash"></i>
                          </button>
                          
                          {/* DEĞİŞİKLİK 2: TARİH YERİNE DOSYA ADI */}
                          {/* Uzun isimler taşmasın diye stil ekledim (text-overflow) */}
                          <span className="Gallery-date" 
                                title={img.filename} 
                                style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; display: inline-block; vertical-align: middle;">
                             {img.filename}
                          </span>

                          <button className="Button Button--icon"
                                  type="button"
                                  style="color: #3498db"
                                  onclick={(e) => this.copyLink(img, e)}
                                  title="Kodu Kopyala">
                              <i className="fas fa-copy"></i>
                          </button>
                      </div>
                  </div>
              ))}
           </div>
        )}
      </div>
    );
  }
}