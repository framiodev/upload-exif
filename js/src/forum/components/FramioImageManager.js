import Component from 'flarum/common/Component';
import CommentPost from 'flarum/forum/components/CommentPost';
import { extend } from 'flarum/common/extend';
import app from 'flarum/forum/app';

class FramioImageCard extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.id = this.attrs.photoId;
    this.data = null;
    this.showExif = false;
    this.fetchExifData();
  }

  fetchExifData() {
    app.request({
      method: 'GET',
      url: app.forum.attribute('apiUrl') + '/framio-image/' + this.id
    }).then(response => {
      this.data = response;
      m.redraw();
    });
  }

  formatDate(dateString) {
    if (!dateString) return '-';
    try {
        const parts = dateString.split(' '); 
        const datePart = parts[0].replace(/:/g, '-');
        const timePart = parts[1] || '';
        const [year, month, day] = datePart.split('-');
        return `${day}-${month}-${year} ${timePart}`;
    } catch (e) { return dateString; }
  }

  view() {
    if (!this.data) return null;
    const exif = JSON.parse(this.data.exif_data || '{}');
    // ... (Buradaki EXIF kartı kodları aynı kalıyor, kısalttım) ...
    const camera = `${exif.make || ''} ${exif.model || ''}`.trim() || 'Belirtilmemiş';
    let lens = exif.lens || 'Belirtilmemiş';
    if (lens !== 'Belirtilmemiş' && camera.includes(lens)) lens = '-';
    const aperture = exif.aperture || '-';
    const exposure = exif.exposure || '-';
    const iso = exif.iso || '-';
    const focal = exif.focal || '-';
    const formattedDate = this.formatDate(exif.date);

    return (
      <div className="FramioCard-exif-wrapper">
        <div className="FramioCard-overlay-controls">
             <a href={this.data.path} target="_blank" className="FramioCard-zoomIcon">Orijinal</a>
        </div>
        <div className="FramioCard-toggle" onclick={() => this.showExif = !this.showExif}>
            <span className="toggle-label">Fotoğraf Bilgileri (EXIF)</span>
            <i className={this.showExif ? "fas fa-chevron-up" : "fas fa-chevron-down"}></i>
        </div>
        {this.showExif ? (
            <div className="FramioCard-exif fade-in">
                <div className="FramioCard-grid">
                    <div className="sc-left-col">
                        <div className="gear-group"><div className="gear-label">Kamera</div><div className="gear-name">{camera}</div></div>
                        <div className="gear-group"><div className="gear-label">Lens</div><div className="lens-name">{lens}</div></div>
                    </div>
                    <div className="sc-right-col">
                        <div className="stat-box"><span>Enstantane</span><b>{exposure}</b></div>
                        <div className="stat-box"><span>Diyafram</span><b>{aperture}</b></div>
                        <div className="stat-box"><span>ISO</span><b>{iso}</b></div>
                        <div className="stat-box"><span>Odak Uzaklığı</span><b>{focal}</b></div>
                    </div>
                    <div className="sc-footer">
                        <div className="date-box"><span>Çekim Tarihi</span><b>{formattedDate}</b></div>
                        {exif.lat && exif.lon ? (<a href={`https://www.google.com/maps?q=${exif.lat},${exif.lon}`} target="_blank" className="map-btn">Haritada Gör</a>) : null}
                    </div>
                </div>
            </div>
        ) : null}
      </div>
    );
  }
}

export default {
  init: () => {
    const mountFramioImages = function() {
      const postBody = this.element.querySelector('.Post-body');
      if (!postBody) return;

      // 1. YENİ SİSTEM
      const containers = postBody.querySelectorAll('.framio-image-container');
      containers.forEach(el => {
        const id = el.getAttribute('data-id');
        const exifPlaceholder = el.querySelector('.framio-exif-placeholder');
        el.classList.add('FramioCard');
        if (exifPlaceholder && !exifPlaceholder.hasChildNodes()) {
            m.mount(exifPlaceholder, { view: () => m(FramioImageCard, { photoId: id }) });
        }
      });


    };

    extend(CommentPost.prototype, 'oncreate', mountFramioImages);
    extend(CommentPost.prototype, 'onupdate', mountFramioImages);
  }
};