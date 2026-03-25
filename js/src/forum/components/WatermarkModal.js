import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import Stream from 'flarum/common/utils/Stream';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/forum/app';

export default class WatermarkModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    
    this.originalFiles = this.attrs.files;
    this.onconfirm = this.attrs.onconfirm;
    
    this.processedFiles = [];
    this.loadingImages = true;
    this.activeIndex = 0;
    this.animating = false;
    this.watermarks = [];

    this.processImages();
    this.loadWatermarks();
  }

  loadWatermarks() {
    app.request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/framio-admin-watermarks'
    }).then(result => {
        if (result && result.data) {
            this.watermarks = result.data.map(wm => ({
                id: wm.filename,
                label: wm.filename.split('-')[0], // Dosya adının ilk kısmı
                url: wm.url,
                bg: '#fff',
                color: '#333',
                border: '#ddd',
                icon: 'fas fa-stamp'
            }));
            m.redraw();
        }
    });
  }

  oncreate(vnode) {
      super.oncreate(vnode);
      const header = vnode.dom.querySelector('.Modal-header');
      if (header) {
          header.style.paddingTop = '5px';
          header.style.paddingBottom = '5px';
      }
  }

  async processImages() {
      const promises = this.originalFiles.map(file => {
          return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                  const img = new Image();
                  img.onload = () => {
                      const isVertical = img.height > img.width;
                      const lastDotIndex = file.name.lastIndexOf('.');
                      const nameWithoutExt = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
                      const extension = lastDotIndex !== -1 ? file.name.substring(lastDotIndex) : '';

                      resolve({
                          originalFile: file,
                          src: e.target.result,
                          width: img.width,
                          height: img.height,
                          isVertical: isVertical,
                          nameStream: Stream(nameWithoutExt),
                          extension: extension,
                          watermarkStream: Stream('none')
                      });
                  };
                  img.src = e.target.result;
              };
              reader.readAsDataURL(file);
          });
      });

      this.processedFiles = await Promise.all(promises);
      this.loadingImages = false;
      m.redraw();
  }

  className() { return 'WatermarkModal'; }
  title() { return `İmza Seçimi (${this.activeIndex + 1}/${this.originalFiles.length})`; }

  content() {
    if (this.loadingImages) {
        return <div className="Modal-body"><LoadingIndicator /></div>;
    }

    const currentFile = this.processedFiles[this.activeIndex];
    const isVerticalImage = currentFile.isVertical;
    const currentWatermarkId = currentFile.watermarkStream();
    const mainOptions = this.watermarks;

    return (
      <div className="Modal-body" style={{ padding: '15px', overflow: 'hidden' }}>
        <div style={{ color: '#e74c3c', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center', marginBottom: '10px', fontSize: '11px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            Crop yapılmış fotoğraflarda imzalar düzgün eklenmeyebilir.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
             <Button 
                className="Button Button--icon Button--link" 
                icon="fas fa-chevron-left" 
                onclick={this.prevSlide.bind(this)}
                disabled={this.processedFiles.length <= 1}
                style={{ fontSize: '20px', color: '#333', opacity: this.activeIndex === 0 ? 0.3 : 1, visibility: this.processedFiles.length <= 1 ? 'hidden' : 'visible' }}
            />

            <div style={{ 
                flex: 1, 
                opacity: this.animating ? 0 : 1, 
                transform: this.animating ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '10px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                            src={currentFile.src} 
                            style={{ display: 'block', maxHeight: '250px', maxWidth: '100%', height: 'auto', objectFit: 'contain' }} 
                        />
                        {this.renderWatermarkOverlay(currentWatermarkId)}
                    </div>

                    <div style={{ marginTop: '5px' }}>
                        <input 
                            className="FormControl" 
                            bidi={currentFile.nameStream} 
                            style={{ textAlign: 'center', fontWeight: 'bold', maxWidth: '250px', margin: '0 auto', fontSize: '13px', height: '30px' }} 
                            placeholder="Dosya Adı"
                        />
                        <div style={{ fontSize: '10px', color: '#999' }}>
                            {currentFile.width}x{currentFile.height} ({isVerticalImage ? 'Dikey' : 'Yatay'})
                        </div>
                    </div>
                </div>

                <div className="Watermark-selection-area" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h4 style={{margin:0, fontSize: '13px'}}>İmza Seçin</h4>
                        {this.processedFiles.length > 1 && (
                            <Button className="Button Button--primary Button--small" onclick={() => this.applyToAll(currentWatermarkId)} style={{fontSize: '11px', padding: '2px 8px'}}>
                                Tümüne Uygula
                            </Button>
                        )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', maxHeight: '120px', overflowY: 'auto', padding: '5px' }}>
                        {mainOptions.map(opt => this.renderOption(opt, currentFile))}
                    </div>

                    <div className={`Watermark-option full-width ${currentWatermarkId === 'none' ? 'active' : ''}`}
                        onclick={() => currentFile.watermarkStream('none')}
                        style={{ 
                            marginTop: '10px', 
                            background: '#eee', 
                            color: '#666', 
                            border: '1px solid #ddd', 
                            padding: '8px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            fontWeight: currentWatermarkId === 'none' ? 'bold' : 'normal'
                        }}
                    >
                        <i className="fas fa-ban"></i> İmzasız Yükle
                    </div>
                </div>
            </div>

             <Button 
                className="Button Button--icon Button--link" 
                icon="fas fa-chevron-right" 
                onclick={this.nextSlide.bind(this)}
                disabled={this.processedFiles.length <= 1}
                style={{ fontSize: '20px', color: '#333', opacity: this.activeIndex === this.processedFiles.length - 1 ? 0.3 : 1, visibility: this.processedFiles.length <= 1 ? 'hidden' : 'visible' }}
            />
        </div>

        <div className="Form-group" style={{marginTop: '10px', marginBottom: 0}}>
            <Button className="Button Button--primary Button--block" onclick={this.confirmUpload.bind(this)}>
                {this.processedFiles.length} Fotoğrafı Yükle
            </Button>
        </div>
      </div>
    );
  }

  changeSlide(direction) {
      if (this.animating) return;
      this.animating = true;
      m.redraw();
      
      setTimeout(() => {
          if (direction === 'next' && this.activeIndex < this.processedFiles.length - 1) {
              this.activeIndex++;
          } else if (direction === 'prev' && this.activeIndex > 0) {
              this.activeIndex--;
          }
          this.animating = false;
          m.redraw();
      }, 200);
  }

  nextSlide() { this.changeSlide('next'); }
  prevSlide() { this.changeSlide('prev'); }

  applyToAll(watermarkId) {
      if (confirm('Seçilen imza türü tüm fotoğraflara uygulanacak. Emin misiniz?')) {
          this.processedFiles.forEach(file => file.watermarkStream(watermarkId));
          m.redraw();
      }
  }

  renderWatermarkOverlay(watermarkId) {
      if (!watermarkId || watermarkId === 'none') return null;
      const wm = this.watermarks.find(w => w.id === watermarkId);
      if (!wm) return null;
      return <img src={wm.url} style={{ position: 'absolute', bottom: '5px', right: '5px', width: '30%', pointerEvents: 'none', zIndex: 10, opacity: 0.8 }} />;
  }

  renderOption(opt, currentFile) {
      const isSelected = currentFile.watermarkStream() === opt.id;
      return (
        <div 
            onclick={() => currentFile.watermarkStream(opt.id)}
            style={{ 
                background: opt.bg, 
                color: opt.color, 
                borderColor: isSelected ? '#4D698E' : opt.border,
                borderWidth: isSelected ? '2px' : '1px',
                borderStyle: 'solid',
                padding: '5px',
                fontSize: '11px',
                textAlign: 'center',
                cursor: 'pointer',
                borderRadius: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px'
            }}
        >
            <img src={opt.url} style={{ width: '100%', height: '30px', objectFit: 'contain' }} />
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>{opt.label}</span>
        </div>
      );
  }

  confirmUpload() {
    const finalFiles = this.processedFiles.map(item => {
        const newName = item.nameStream() + item.extension;
        try {
            return new File([item.originalFile], newName, { type: item.originalFile.type });
        } catch (e) {
            return item.originalFile;
        }
    });

    const finalWatermarks = this.processedFiles.map(f => f.watermarkStream());

    if (this.onconfirm) {
        this.onconfirm(finalWatermarks, finalFiles);
    }
    this.hide();
  }
}