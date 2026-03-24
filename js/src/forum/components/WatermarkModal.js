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
    this.showHiddenOptions = false;
    
    // Animasyon Durumu
    this.animating = false;

    // --- İMZA SEÇENEKLERİ ---
    this.horizontalOptions = [
        { id: 'framio_wm_beyaz_yatay_orta', label: 'Beyaz - Orta',  type: 'center', style: 'white', icon: 'fas fa-minus', color: '#333', bg: '#fff', border: '#ddd' },
        { id: 'framio_wm_siyah_yatay_orta', label: 'Siyah - Orta',  type: 'center', style: 'black', icon: 'fas fa-minus', color: '#fff', bg: '#333', border: '#333' },
        { id: 'framio_wm_renkli_yatay_orta', label: 'Renkli - Orta', type: 'center', style: 'color', icon: 'fas fa-minus', color: '#e74c3c', bg: '#f9f9f9', border: '#e74c3c' },
        { id: 'framio_wm_beyaz_yatay_kose', label: 'Beyaz - Köşe',  type: 'corner', style: 'white', icon: 'fas fa-external-link-alt', color: '#333', bg: '#fff', border: '#ddd' },
        { id: 'framio_wm_siyah_yatay_kose', label: 'Siyah - Köşe',  type: 'corner', style: 'black', icon: 'fas fa-external-link-alt', color: '#fff', bg: '#333', border: '#333' },
        { id: 'framio_wm_renkli_yatay_kose', label: 'Renkli - Köşe', type: 'corner', style: 'color', icon: 'fas fa-external-link-alt', color: '#e74c3c', bg: '#f9f9f9', border: '#e74c3c' },
    ];

    this.verticalOptions = [
        { id: 'framio_wm_beyaz_dikey',  label: 'Beyaz Dikey',  type: 'vertical', style: 'white', icon: 'fas fa-arrows-alt-v', color: '#333', bg: '#fff', border: '#ddd' },
        { id: 'framio_wm_siyah_dikey',  label: 'Siyah Dikey',  type: 'vertical', style: 'black', icon: 'fas fa-arrows-alt-v', color: '#fff', bg: '#333', border: '#333' },
        { id: 'framio_wm_renkli_dikey', label: 'Renkli Dikey', type: 'vertical', style: 'color', icon: 'fas fa-arrows-alt-v', color: '#e74c3c', bg: '#f9f9f9', border: '#e74c3c' },
    ];

    
  }

  // Header alanını daraltmak için DOM manipülasyonu
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
    const hiddenOptions = [];
return (
      <div className="Modal-body" style={{ padding: '15px', overflow: 'hidden' }}>
        {/* KIRMIZI UYARI */}
        <div style={{ color: '#e74c3c', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'center', marginBottom: '10px', fontSize: '12px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
            Crop yapılmış fotoğraflarda imzalar düzgün eklenmeyebilir. Bu tarz durumlarda cihazınızdaki görsel düzenleme araçlarını kullanınız.
        </div>

        {/* GEÇİŞ BUTONLARI VE İÇERİK */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
             {/* SOL OK */}
             <Button 
                className="Button Button--icon Button--link" 
                icon="fas fa-chevron-left" 
                onclick={this.prevSlide.bind(this)}
                disabled={this.processedFiles.length <= 1}
                style={{ fontSize: '20px', color: '#333', opacity: this.activeIndex === 0 ? 0.3 : 1, visibility: this.processedFiles.length <= 1 ? 'hidden' : 'visible' }}
            />

            {/* ANİMASYONLU İÇERİK ALANI (Görsel + Seçenekler) */}
            <div style={{ 
                flex: 1, 
                opacity: this.animating ? 0 : 1, 
                transform: this.animating ? 'scale(0.98)' : 'scale(1)',
                transition: 'all 0.2s ease-in-out'
            }}>
                
                {/* --- ÖNİZLEME --- */}
                <div style={{ textAlign: 'center', marginBottom: '10px', position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img 
                            src={currentFile.src} 
                            style={{ 
                                display: 'block', 
                                maxHeight: '250px',
                                maxWidth: '100%', 
                                height: 'auto',
                                objectFit: 'contain'
                            }} 
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

                {/* --- SEÇİM ALANI --- */}
                <div className="Watermark-selection-area" style={{ background: '#f9f9f9', padding: '10px', borderRadius: '8px' }}>
                    
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h4 className="Watermark-group-title" style={{margin:0, fontSize: '14px'}}>
                            <i className={isVerticalImage ? "fas fa-portrait" : "fas fa-image"}></i> 
                            {isVerticalImage ? ' Dikey İmzalar' : ' Yatay İmzalar'}
                        </h4>
                        
                        {this.processedFiles.length > 1 && (
                            <Button 
                                className="Button Button--primary Button--small" 
                                onclick={() => this.applyToAll(currentWatermarkId)}
                                style={{fontSize: '11px', padding: '2px 8px'}}
                            >
                                Tümüne Uygula
                            </Button>
                        )}
                    </div>
                    
                    <div className="Watermark-grid">
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
                            boxShadow: currentWatermarkId === 'none' ? '0 0 0 2px #666' : 'none'
                        }}
                    >
                        <i className="fas fa-ban"></i>
                        <span>İmza Olmadan Yükle</span>
                        {currentWatermarkId === 'none' ? <i className="fas fa-check-circle selected-icon" style={{color: '#666'}}></i> : null}
                    </div>
                </div>

            </div>
             {/* SAĞ OK */}
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

  // --- FONKSİYONLAR ---

  changeSlide(direction) {
      this.animating = true;
      m.redraw();
      
      setTimeout(() => {
          if (direction === 'next' && this.activeIndex < this.processedFiles.length - 1) {
              this.activeIndex++;
          } else if (direction === 'prev' && this.activeIndex > 0) {
              this.activeIndex--;
          }
          this.showHiddenOptions = false;
          this.animating = false;
          m.redraw();
      }, 200);
  }

  nextSlide() {
      this.changeSlide('next');
  }

  prevSlide() {
      this.changeSlide('prev');
  }

  applyToAll(watermarkId) {
      if (confirm('Seçilen imza türü listedeki TÜM fotoğraflara uygulanacak. Emin misiniz?')) {
          this.processedFiles.forEach(file => file.watermarkStream(watermarkId));
          m.redraw();
      }
  }

  renderWatermarkOverlay(watermarkId) {
      if (!watermarkId || watermarkId === 'none') return null;

      const wm = this.watermarks.find(w => w.id === watermarkId);
      if (!wm) return null;

      let style = { position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none', zIndex: 10 };
      return <img src={wm.url} style={style} />;
  }

  renderOption(opt, currentFile) {
      const isSelected = currentFile.watermarkStream() === opt.id;
      const activeBorderColor = opt.style === 'white' ? '#999' : (opt.style === 'black' ? '#000' : '#c0392b');

      return (
        <div 
            className={`Watermark-option`}
            onclick={() => currentFile.watermarkStream(opt.id)}
            style={{ 
                background: opt.bg, 
                color: opt.color, 
                borderColor: isSelected ? activeBorderColor : opt.border,
                borderWidth: isSelected ? '3px' : '1px',
                borderStyle: 'solid',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? '0 4px 10px rgba(0,0,0,0.1)' : 'none',
                position: 'relative',
                padding: '8px',
                fontSize: '12px'
            }}
        >
            <i className={opt.icon}></i>
            <span>{opt.label}</span>
            {isSelected ? <i className="fas fa-check-circle selected-icon" style={{color: activeBorderColor}}></i> : null}
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