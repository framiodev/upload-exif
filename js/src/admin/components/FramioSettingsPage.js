import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/admin/app';
import saveSettings from 'flarum/admin/utils/saveSettings';
import Stream from 'flarum/common/utils/Stream';

export default class FramioSettingsPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.activeTab = 'general';
    this.tabs = [
      { id: 'general', label: 'Genel Yap�land�rma', icon: 'fas fa-cogs' },
      { id: 'firebase', label: 'Firebase Depolama', icon: 'fas fa-cloud-upload-alt' },
      { id: 'customfields', label: '�zel Alanlar (Fields)', icon: 'fas fa-list' },
      { id: 'watermarks', label: 'Filigran (�mza)', icon: 'fas fa-stamp' },
      { id: 'seo', label: 'SEO ve ��lemler', icon: 'fas fa-search' },
      { id: 'media', label: 'Medya Y�netimi', icon: 'fas fa-images' }
    ];

    this.searchQuery = '';
    this.images = []; this.adminWatermarks = [];
    this.isLoading = false;
    this.isUpdatingTags = false;
    
    this.offset = 0;
    this.limit = 14; 

    this.editingImageId = null;
    this.editingName = '';
    this.isSavingName = false;

    this.customFields = [];
    try {
        const stored = app.data.settings['framio-upload-exif.custom_fields'];
        if (stored) this.customFields = JSON.parse(stored);
    } catch (e) {}

    this.loadImages(); this.loadWatermarks();
  }

  content() {
    return [
      <div className="FramioSettingsPage">
        <div className="container" style={{ maxWidth: '1400px', marginTop: '30px', marginBottom: '40px' }}>
          
          <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
            <div style={{ width: '280px', flexShrink: 0 }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e9ecef', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                {this.tabs.map(tab => (
                  <li 
                    onclick={() => { this.activeTab = tab.id; m.redraw(); }}
                    style={{ 
                      padding: '16px 20px', 
                      cursor: 'pointer',
                      borderBottom: '1px solid #e9ecef',
                      background: this.activeTab === tab.id ? '#4D698E' : 'transparent',
                      color: this.activeTab === tab.id ? '#fff' : '#333',
                      fontWeight: this.activeTab === tab.id ? 'bold' : 'normal',
                      transition: 'all 0.2s ease',
                      fontSize: '15px'
                    }}
                  >
                    <i className={tab.icon} style={{ width: '30px', textAlign: 'center', opacity: this.activeTab === tab.id ? 1 : 0.6 }}></i> {tab.label}
                  </li>
                ))}
              </ul>
              
              <div style={{ marginTop: '20px' }}>
                <Button className="Button Button--primary" onclick={this.save.bind(this)} icon="fas fa-save" style={{ width: '100%', padding: '12px', fontSize: '15px', fontWeight: 'bold' }}>
                    Ayarlar� Kaydet
                </Button>
              </div>
            </div>
            
            <div style={{ flex: 1, background: '#fff', border: '1px solid #e9ecef', borderRadius: '8px', padding: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', minHeight: '600px' }}>
                {this.activeTab === 'general' && this.renderGeneralTab()}
                {this.activeTab === 'firebase' && this.renderFirebaseTab()}
                {this.activeTab === 'customfields' && this.renderCustomFieldsTab()}
                {this.activeTab === 'watermarks' && this.renderWatermarksTab()}
                {this.activeTab === 'seo' && this.renderSeoTab()}
                {this.activeTab === 'media' && this.renderMediaTab()}
            </div>
          </div>
          
        </div>
      </div>
    ];
  }

  renderGeneralTab() {
    return (
      <div className="Form-group">
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '25px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Genel Yap�land�rma</h3>
        {this.buildSettingComponent({
            type: 'number',
            setting: 'framio-upload-exif.resize_width',
            label: 'Maksimum Foto�raf Geni�li�i (px)',
            placeholder: '3840'
        })}
        {this.buildSettingComponent({
            type: 'number',
            setting: 'framio-upload-exif.compression_quality',
            label: 'S�k��t�rma Kalitesi (0-100)',
            placeholder: '90'
        })}
         {this.buildSettingComponent({
            type: 'number',
            setting: 'framio-upload-exif.thumb_width',
            label: 'Thumbnail Geni�li�i',
            placeholder: '1024'
        })}
         {this.buildSettingComponent({
            type: 'number',
            setting: 'framio-upload-exif.mini_width',
            label: 'Mini Galeri Geni�li�i',
            placeholder: '250'
        })}
      </div>
    );
  }

  renderFirebaseTab() {
    return (
      <div className="Form-group">
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Firebase Depolama Ayarlar�</h3>
        <div className="helpText" style={{ marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>G�rsellerin y�klenece�i Firebase Storage (Google Cloud) kimlik ve kova bilgilerini giriniz. Kimlik bilgilerini bo� b�rak�rsan�z sistem <code>storage/firebase-auth.json</code> dosyas�n� aramaya devam eder.</div>
        
        {this.buildSettingComponent({
            type: 'text',
            setting: 'framio-upload-exif.firebase_bucket',
            label: 'Firebase Bucket Ad�',
            placeholder: 'ornek-proje.appspot.com'
        })}
        
        <div className="Form-group" style={{ marginTop: '25px' }}>
          <label style={{ fontWeight: 'bold' }}>Firebase Kimlik (JSON) ��eri�i</label>
          <textarea 
            className="FormControl" 
            rows="10" 
            bidi={this.setting('framio-upload-exif.firebase_credentials')} 
            placeholder='{"type": "service_account", "project_id": "...", ...}'
            style={{ fontFamily: 'monospace', fontSize: '13px', background: '#f8f9fa' }}
          />
        </div>
      </div>
    );
  }

  renderCustomFieldsTab() {
    return (
      <div className="Form-group">
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Dinamik �zel Alanlar (Custom Fields)</h3>
        <div className="helpText" style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
            Foto�raf y�klerken kullan�c�lara sorulacak dinamik etiket alanlar� olu�turun. <strong>(A��r vas�ta, gezi, emlak vb. her t�rl� siteye uyar)</strong><br/>
            <strong>Alan Ad�:</strong> Formda g�r�necek etiket (�rn: <code>Lokasyon</code>, <code>Kamera Modeli</code>).<br/>
            <strong>Se�enekler:</strong> Belirli se�enekler sunmak isterseniz araya virg�l koyarak yaz�n (�rn: <code>Nikon, Canon, Sony</code>). Bo� b�rak�l�rsa serbest metin giri�i olur.
        </div>
        
        {this.customFields.map((field, index) => (
            <div style={{ display: 'flex', gap: '15px', marginBottom: '15px', alignItems: 'center', background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                <input className="FormControl" placeholder="Alan Ad� (�rn: Lokasyon)" value={field.label} oninput={e => field.label = e.target.value} style={{ flex: 1 }} />
                <input className="FormControl" placeholder="Sadece �u url de g�ster (Ops. d/77)" value={field.tags} oninput={e => field.tags = e.target.value} style={{ flex: 1 }} />
                <input className="FormControl" placeholder="Dropdown �n Tan�ml� Se�enekleri (Virg�lle ay�r)" value={field.options} oninput={e => field.options = e.target.value} style={{ flex: 1.5 }} />
                <Button className="Button Button--danger Button--icon" onclick={() => this.customFields.splice(index, 1)} icon="fas fa-trash-alt" title="Sil"></Button>
            </div>
        ))}
        
        <div style={{ marginTop: '25px' }}>
            <Button className="Button" onclick={() => this.customFields.push({label: '', tags: '', options: ''})} icon="fas fa-plus">
                Yeni �zel Alan Ekle
            </Button>
        </div>
      </div>
    );
  }

  renderSeoTab() {
    return (
      <div className="Form-group">
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>SEO ve Toplu ��lemler</h3>
        <div className="helpText" style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
            Forumda mevcut olan t�m foto�raflar� tarar ve mesaj i�erisine girilmi� olan k�nye bilgilerini bularak foto�raflar�n <strong>ALT</strong> etiketlerine otomatik olarak uygular. Sitenizin arama motorlar�ndaki performans�n� art�rmak i�in bu i�lemi yapabilirsiniz.
        </div>
        <Button 
            className="Button Button--warning" 
            loading={this.isUpdatingTags} 
            onclick={this.updateTags.bind(this)}
            icon="fas fa-sync-alt"
            style={{ padding: '10px 20px', fontSize: '15px' }}
        >
            Eski ALT Etiketlerini Topluca G�ncelle
        </Button>
      </div>
    );
  }

  renderMediaTab() {
    return (
      <div className="MediaManager-section">
        <div className="MediaManager-header" style={{
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px', 
            flexWrap: 'wrap', 
            gap: '15px',
            borderBottom: '1px solid #eee',
            paddingBottom: '15px'
        }}>
            <h3 className="Settings-title" style={{ margin: 0 }}>Medya Y�netimi</h3>
            
            <div className="MediaManager-search" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                <input 
                    className="FormControl" 
                    type="text" 
                    placeholder="Dosya ad� veya kullan�c� ara..." 
                    value={this.searchQuery}
                    oninput={e => this.searchQuery = e.target.value}
                    onkeydown={e => { if (e.key === 'Enter') this.performSearch(); }}
                    style={{width: '300px'}} 
                />
                <Button className="Button Button--primary" onclick={this.performSearch.bind(this)}>
                    <i className="fas fa-search"></i>
                </Button>
            </div>
        </div>

        <div className="MediaManager-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '20px',
            marginBottom: '30px'
        }}>
            {this.isLoading ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px'}}>
                    <LoadingIndicator />
                </div>
            ) : this.images.length === 0 ? (
                <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '60px', fontStyle: 'italic', background: '#f8f9fa', borderRadius: '8px'}}>
                    Kriterlere uygun g�rsel bulunamad�.
                </div>
            ) : (
                this.images.map(image => {
                    const thumbUrl = image.attributes.thumb_path || image.attributes.url;
                    const isEditing = this.editingImageId === image.id;
                    const filenameWithoutExt = image.attributes.filename ? image.attributes.filename.replace(/.[^/.]+$/, '') : '';
                    
                    return (
                        <div className="MediaManager-card" style={{
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{
                                height: '150px', 
                                backgroundColor: '#f9f9f9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                borderBottom: '1px solid #eee'
                            }}>
                                <a href={image.attributes.url} target="_blank" style={{width: '100%', height: '100%'}}>
                                    <img 
                                        src={thumbUrl} 
                                        alt="Thumbnail" 
                                        loading="lazy" 
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                </a>
                            </div>

                            <div style={{padding: '12px', fontSize: '13px', flexGrow: 1}}>
                                {isEditing ? (
                                    <div style={{marginBottom: '8px'}}>
                                        <input
                                            className="FormControl"
                                            type="text"
                                            value={this.editingName}
                                            oninput={e => { this.editingName = e.target.value; }}
                                            onkeydown={e => {
                                                if (e.key === 'Enter') this.saveImageName(image);
                                                if (e.key === 'Escape') this.cancelEditName();
                                            }}
                                            style={{ fontSize: '12px', padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}
                                            oncreate={vnode => { vnode.dom.focus(); vnode.dom.select(); }}
                                        />
                                        <div style={{display: 'flex', gap: '5px', marginTop: '6px'}}>
                                            <Button className="Button Button--primary Button--small" loading={this.isSavingName} onclick={() => this.saveImageName(image)} style={{flex: 1}}>
                                                <i className="fas fa-check"></i>
                                            </Button>
                                            <Button className="Button Button--small" onclick={() => this.cancelEditName()} disabled={this.isSavingName} style={{flex: 1}}>
                                                <i className="fas fa-times"></i>
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div title={image.attributes.filename} style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '8px' }}>
                                        {image.attributes.filename}
                                    </div>
                                )}
                                <div style={{color: '#666', marginBottom: '4px'}}>
                                    <i className="fas fa-user" style={{width: '16px'}}></i> {image.attributes.username}
                                </div>
                                <div style={{color: '#999'}}>
                                    <i className="fas fa-clock" style={{width: '16px'}}></i> {image.attributes.createdAt}
                                </div>
                            </div>

                            <div style={{padding: '8px', background: '#fafafa', borderTop: '1px solid #eee', display: 'flex', gap: '5px'}}>
                                <Button 
                                    className="Button Button--small" 
                                    icon="fas fa-pen"
                                    onclick={() => this.startEditName(image, filenameWithoutExt)}
                                    style={{flex: 1, color: '#2196F3', borderColor: '#2196F3'}}
                                    disabled={this.isSavingName}
                                    title="Dosya Ad� D�zenle"
                                >
                                    D�zenle
                                </Button>
                                <Button 
                                    className="Button Button--danger Button--small" 
                                    icon="fas fa-trash-alt"
                                    onclick={() => this.deleteImage(image)}
                                    style={{flex: 1}}
                                    disabled={this.isSavingName}
                                >
                                    Sil
                                </Button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        <div className="MediaManager-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'center' }}>
            <Button className="Button" icon="fas fa-chevron-left" disabled={this.offset === 0} onclick={() => this.changePage(-1)}>
                �nceki
            </Button>
            <span style={{fontWeight: 'bold', color: '#666', fontSize: '15px'}}>
                {this.images.length > 0 ? `${this.offset + 1} - ${this.offset + this.images.length}` : '0'}
            </span>
            <Button className="Button" icon="fas fa-chevron-right" disabled={this.images.length < this.limit} onclick={() => this.changePage(1)}>
                Sonraki
            </Button>
        </div>
      </div>
    );
  }

  
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
          app.alerts.show({ type: 'success' }, 'Filigran y�klendi.');
          m.redraw();
      }).catch(err => {
          app.alerts.show({ type: 'error' }, 'Y�kleme ba�ar�s�z. Sadece PNG desteklenir.');
      });
      e.target.value = '';
  }

  deleteWatermark(filename) {
      if (!confirm(filename + ' dosyas�n� silmek istedi�inize emin misiniz?')) return;
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
        <h3 className="Settings-title" style={{ marginTop: 0, marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Filigran (Watermark) Y�netimi</h3>
        <div className="helpText" style={{ marginBottom: '30px', fontSize: '14px', lineHeight: '1.6' }}>
            Kullan�c�lar�n foto�raf y�klerken se�ebilecekleri �irket logolar�n� / imzalar�n� buradan y�kleyin.<br/>
            <strong>Tavsiye:</strong> �mzalar�n�z <code>.PNG</code> format�nda olmal� ve arka plan� �effaf (transparan) olmal�d�r. (Maks 1000px geni�lik �nerilir).
        </div>
        
        <div style={{ marginBottom: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
                <strong>Yeni Filigran Y�kle</strong><br/>
                <span style={{fontSize:'12px', color:'#777'}}>Sadece �effaf .PNG format�</span>
            </div>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
                <Button className="Button Button--primary" icon="fas fa-upload">Dosya Se� ve Y�kle</Button>
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
                    Sistemde y�kl� bir filigran bulunmuyor.
                </div>
            ) : (
                this.adminWatermarks.map(wm => (
                    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                        <div style={{ height: '120px', background: '#e9ecef url("data:image/svg+xml,%3Csvg width=\\\'10\\\' height=\\\'10\\\' viewBox=\\\'0 0 10 10\\\' xmlns=\\\'http://www.w3.org/2000/svg\\\'%3E%3Cpath fill=\\\'%23d5d5d5\\\' fill-rule=\\\'evenodd\\\' d=\\\'M0 0h5v5H0V0zm5 5h5v5H5V5z\\\'/%3E%3C/svg%3E") repeat', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px' }}>
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


  startEditName(image, currentName) {
    this.editingImageId = image.id;
    this.editingName = currentName;
    m.redraw();
  }

  cancelEditName() {
    this.editingImageId = null;
    this.editingName = '';
    m.redraw();
  }

  saveImageName(image) {
    const newName = this.editingName.trim();
    if (!newName) {
      app.alerts.show({ type: 'error' }, 'Dosya ad� bo� olamaz.');
      return;
    }

    const currentNameWithoutExt = image.attributes.filename ? image.attributes.filename.replace(/.[^/.]+$/, '') : '';
    if (newName === currentNameWithoutExt) {
      this.cancelEditName();
      return;
    }

    this.isSavingName = true;
    m.redraw();

    app.request({
      method: 'PATCH',
      url: app.forum.attribute('apiUrl') + '/framio-image/' + image.id,
      body: { name: newName }
    }).then(response => {
      image.attributes.filename = response.filename;
      image.attributes.url = response.thumb_path || response.url;
      image.attributes.thumb_path = response.thumb_path;
      
      app.alerts.show({ type: 'success' }, 'Dosya ad� ba�ar�yla g�ncellendi.');
      
      this.editingImageId = null;
      this.editingName = '';
      this.isSavingName = false;
      m.redraw();
    }).catch(error => {
      const errorMsg = error && error.responseJSON && error.responseJSON.error ? error.responseJSON.error : '��lem ba�ar�s�z.';
      app.alerts.show({ type: 'error' }, errorMsg);
      this.isSavingName = false;
      m.redraw();
    });
  }

  save() {
    if (!this.settings['framio-upload-exif.custom_fields']) {
        this.settings['framio-upload-exif.custom_fields'] = Stream('');
    }
    this.settings['framio-upload-exif.custom_fields'](JSON.stringify(this.customFields));

    saveSettings(this.settings)
      .then(() => app.alerts.show({ type: 'success' }, 'T�m ayarlar ba�ar�yla kaydedildi!'));
  }

  updateTags() {
    if (!confirm('T�m foto�raflar�n ALT etiketleri mesajlardaki bilgilerle g�ncellenecek. Devam?')) return;

    this.isUpdatingTags = true;
    m.redraw();

    app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/framio-update-alt-tags'
    }).then(response => {
        app.alerts.show({ type: 'success' }, `Ba�ar�l�! Toplam ${response.updated_count} ba�lant� g�ncellendi.`);
    }).catch(error => {
        app.alerts.show({ type: 'error' }, 'Beklenmedik bir hata olu�tu.');
    }).finally(() => {
        this.isUpdatingTags = false;
        m.redraw();
    });
  }

  performSearch() {
    this.offset = 0;
    this.loadImages(); this.loadWatermarks();
  }

  changePage(direction) {
    this.offset += direction * this.limit;
    if (this.offset < 0) this.offset = 0;
    this.loadImages(); this.loadWatermarks();
  }

  loadImages() {
    this.isLoading = true;
    this.images = []; this.adminWatermarks = []; 
    m.redraw();

    const params = { page: { offset: this.offset, limit: this.limit } };
    if (this.searchQuery) params.filter = { q: this.searchQuery };

    app.request({
        method: 'GET',
        url: app.forum.attribute('apiUrl') + '/framio-images/all',
        params: params
    }).then(result => {
        const users = {};
        if (result.included) {
            result.included.forEach(record => {
                if (record.type === 'users') users[record.id] = record.attributes;
            });
        }

        this.images = result.data.map(img => {
            let username = 'Bilinmiyor';
            if (img.relationships && img.relationships.user && img.relationships.user.data) {
                const userId = img.relationships.user.data.id;
                if (users[userId]) username = users[userId].username;
            }
            img.attributes.username = username;
            
            if (img.attributes.createdAt) {
                const date = new Date(img.attributes.createdAt);
                img.attributes.createdAt = date.toLocaleDateString('tr-TR');
            }
            return img;
        });

        this.isLoading = false;
        m.redraw();
    });
  }
}
