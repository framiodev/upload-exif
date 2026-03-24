const fs = require('fs');

// --- WatermarkModal ---
let wmModal = fs.readFileSync('js/src/forum/components/WatermarkModal.js', 'utf8');

const regexOptions = /\/\/ --- ÝMZA SEÇENEKLERÝ ---\s+this\.horizontalOptions[\s\S]*?this\.verticalOptions[\s\S]*?\];/m;

wmModal = wmModal.replace(regexOptions, `// --- ÝMZA SEÇENEKLERÝ ---
    this.watermarks = [];
    this.loadingImages = true;

    app.request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/framio-admin-watermarks'
    }).then(result => {
        if (result && result.data) {
            this.watermarks = result.data.map(item => {
                return {
                    id: item.filename.replace('.png', ''),
                    filename: item.filename,
                    label: item.filename,
                    url: item.url,
                    icon: 'fas fa-image',
                    bg: '#fff',
                    color: '#333',
                    border: '#ddd'
                }
            });
        }
    }).catch(e => {
        console.error("Watermark yuklenirken hata", e);
    }).finally(() => {
        this.processImages();
    });
`);

const regexProcess = /this\.processImages\(\);/m;
wmModal = wmModal.replace(regexProcess, ''); // We just moved it inside finally block above

// Render method refactor for watermarks
const regexRenderGrid = /const mainOptions.*?(?=return \()/ms;

wmModal = wmModal.replace(regexRenderGrid, `
    const mainOptions = this.watermarks;
    const hiddenOptions = [];
`);

const regexReplaceRenderWatermark = /renderWatermarkOverlay\(watermarkId\) \{[\s\S]*?return <img[^>]+>;\s*}/m;
wmModal = wmModal.replace(regexReplaceRenderWatermark, `renderWatermarkOverlay(watermarkId) {
      if (!watermarkId || watermarkId === 'none') return null;

      const wm = this.watermarks.find(w => w.id === watermarkId);
      if (!wm) return null;

      let style = { position: 'absolute', bottom: 0, left: 0, width: '100%', pointerEvents: 'none', zIndex: 10 };
      return <img src={wm.url} style={style} />;
  }`);

const regexButtonsBlock = /<div style={{ marginTop: '10px', borderTop: '1px dashed #ddd', paddingTop: '5px' }}>[\s\S]*?<\/div>[\s\S]*?<\/div>\s*<div\s*className=\{\`Watermark-option full-width/m;

wmModal = wmModal.replace(regexButtonsBlock, `<div className={\`Watermark-option full-width`); // Removed Diðerlerini gizle/göster structure


fs.writeFileSync('js/src/forum/components/WatermarkModal.js', wmModal, 'utf8');

// --- SettingsPage ---
let sp = fs.readFileSync('js/src/admin/components/FramioSettingsPage.js', 'utf8');
sp = sp.replace(`{ id: 'customfields', label: 'Özel Alanlar (Fields)', icon: 'fas fa-list' },`, `{ id: 'customfields', label: 'Özel Alanlar (Fields)', icon: 'fas fa-list' },
      { id: 'watermarks', label: 'Filigran (Ýmza)', icon: 'fas fa-stamp' },`);

sp = sp.replace(`{this.activeTab === 'customfields' && this.renderCustomFieldsTab()}`, `{this.activeTab === 'customfields' && this.renderCustomFieldsTab()}
                {this.activeTab === 'watermarks' && this.renderWatermarksTab()}`);

sp = sp.replace(/this\.images = \[\];/g, 'this.images = []; this.adminWatermarks = [];');
sp = sp.replace(/this\.loadImages\(\);/g, 'this.loadImages(); this.loadWatermarks();');

const newMethods = `
  loadWatermarks() {
    app.request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/framio-admin-watermarks'
    }).then(result => {
        if (result && result.data) {
            this.adminWatermarks = result.data;
            m.redraw();
        }
    });
  }

  uploadWatermark(e) {
      const file = e.target.files[0];
      if (!file) return;

      const data = new FormData();
      data.append('watermark', file);

      app.request({
          method: 'POST',
          url: app.forum.attribute('apiUrl') + '/framio-admin-watermarks',
          body: data,
          serialize: raw => raw
      }).then(response => {
          this.adminWatermarks.push({
              filename: response.filename,
              url: response.url
          });
          app.alerts.show({ type: 'success' }, 'Filigran yüklendi.');
          m.redraw();
      }).catch(err => {
          app.alerts.show({ type: 'error' }, 'Yükleme baþarýsýz. Sadece PNG desteklenir.');
      });
      e.target.value = '';
  }

  deleteWatermark(filename) {
      if (!confirm(filename + ' dosyasýný silmek istediðinize emin misiniz?')) return;
      app.request({
          method: 'DELETE',
          url: app.forum.attribute('apiUrl') + '/framio-admin-watermarks?filename=' + encodeURIComponent(filename),
      }).then(() => {
          this.adminWatermarks = this.adminWatermarks.filter(w => w.filename !== filename);
          app.alerts.show({ type: 'success' }, 'Filigran silindi.');
          m.redraw();
      });
  }

  renderWatermarksTab() {
    return (
      <div className="Form-group">
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Filigran (Watermark) Yönetimi</h3>
        <div className="helpText" style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
            Kullanýcýlarýn fotoðraf yüklerken seçebilecekleri þirket logolarýný / imzalarýný buradan yükleyin.<br/>
            <strong>Tavsiye:</strong> Ýmzalarýnýz <code>.PNG</code> formatýnda olmalý ve arka planý þeffaf (transparan) olmalýdýr. (Maks 1000px geniþlik önerilir).
        </div>
        
        <div style={{ marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <strong>Yeni Filigran Yükle</strong><br/>
                <span style={{fontSize:'12px', color:'#777'}}>Sadece þeffaf .PNG formatý</span>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <Button className="Button Button--primary" icon="fas fa-upload">Dosya Seç ve Yükle</Button>
                <input 
                    type="file" 
                    accept="image/png" 
                    onchange={this.uploadWatermark.bind(this)} 
                    style={{ position: 'absolute', top: 0, right: 0, margin: 0, padding: 0, fontSize: '20px', cursor: 'pointer', opacity: 0, height: '100%' }}
                />
            </div>
        </div>

        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
            gap: '20px' 
        }}>
            {this.adminWatermarks.length === 0 ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '40px', fontStyle: 'italic', background: '#f8f9fa', borderRadius: '8px'}}>
                    Sistemde yüklü bir filigran bulunmuyor.
                </div>
            ) : (
                this.adminWatermarks.map(wm => (
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                        <div style={{ height: '120px', background: '#e9ecef url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath fill=\'%23d5d5d5\' fill-rule=\'evenodd\' d=\'M0 0h5v5H0V0zm5 5h5v5H5V5z\'/%3E%3C/svg%3E") repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
                            <img src={wm.url} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div style={{ padding: '10px', fontSize: '12px', borderTop: '1px solid #ddd', textAlign: 'center' }}>
                            <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', marginBottom: '8px', fontWeight: 'bold' }}>{wm.filename}</div>
                            <Button className="Button Button--danger Button--small Button--block" icon="fas fa-trash-alt" onclick={() => this.deleteWatermark(wm.filename)}>
                                Sil
                            </Button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    );
  }

  /* --- ACTIONS --- */
`;
sp = sp.replace(`/* --- ACTIONS --- */`, newMethods);
fs.writeFileSync('js/src/admin/components/FramioSettingsPage.js', sp, 'utf8');
