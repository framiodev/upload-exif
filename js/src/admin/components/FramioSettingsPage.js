import ExtensionPage from 'flarum/admin/components/ExtensionPage';
import Button from 'flarum/common/components/Button';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import app from 'flarum/admin/app';
import saveSettings from 'flarum/admin/utils/saveSettings';
import Stream from 'flarum/common/utils/Stream';

export default class FramioSettingsPage extends ExtensionPage {
  oninit(vnode) {
    super.oninit(vnode);

    this.searchQuery = '';
    this.images = [];
    this.isLoading = false;
    this.isUpdatingTags = false;
    
    this.offset = 0;
    this.limit = 14; 

    this.editingImageId = null;
    this.editingName = '';
    this.isSavingName = false;

    this.brandModelRules = [];
    try {
        const stored = app.data.settings['framio-upload-exif.brand_models'];
        if (stored) this.brandModelRules = JSON.parse(stored);
    } catch (e) {}

    this.loadImages();
  }

  content() {
    return [
      <div className="FramioSettingsPage">
        <div className="container">
          
          <div className="Form-group">
            <h3 className="Settings-title">Genel Yapılandırma</h3>
            {this.buildSettingComponent({
                type: 'number',
                setting: 'framio-upload-exif.resize_width',
                label: 'Maksimum Fotoğraf Genişliği (px)',
                placeholder: '3840'
            })}
            {this.buildSettingComponent({
                type: 'number',
                setting: 'framio-upload-exif.compression_quality',
                label: 'Sıkıştırma Kalitesi (0-100)',
                placeholder: '90'
            })}
             {this.buildSettingComponent({
                type: 'number',
                setting: 'framio-upload-exif.thumb_width',
                label: 'Thumbnail Genişliği',
                placeholder: '1024'
            })}
             {this.buildSettingComponent({
                type: 'number',
                setting: 'framio-upload-exif.mini_width',
                label: 'Mini Galeri Genişliği',
                placeholder: '250'
            })}

            <h3 className="Settings-title" style={{ marginTop: '30px' }}>Firebase Depolama Ayrları</h3>
            <div className="helpText">Görsellerin yükleneceği Firebase Storage (Google Cloud) kimlik ve kova bilgilerini giriniz. Kimlik bilgilerini boş bırakırsanız sistem "storage/firebase-auth.json" dosyasını aramaya devam eder.</div>
            
            {this.buildSettingComponent({
                type: 'text',
                setting: 'framio-upload-exif.firebase_bucket',
                label: 'Firebase Bucket Adı',
                placeholder: 'ornek-proje.appspot.com'
            })}
            
            <div className="Form-group">
              <label>Firebase Kimlik (JSON) İçeriği</label>
              <textarea 
                className="FormControl" 
                rows="6" 
                bidi={this.setting('framio-upload-exif.firebase_credentials')} 
                placeholder='{"type": "service_account", "project_id": "...", ...}'
              />
            </div>
            
            <div className="Form-group" style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #e9ecef' }}>
                <h3 className="Settings-title" style={{ marginBottom: '10px' }}>Konu - Marka & Model Eşleştirmesi</h3>
                <div className="helpText" style={{ marginBottom: '15px' }}>
                    Belirli bir konuda (başlıkta) Marka ve Model alanlarını otomatik doldurun ve kısıtlayın. <br/>
                    <strong>Konu Yolu:</strong> Flarum'da konunun adres çubuğundaki yoludur (örn: <code>d/77-mercedes-benz-tourismo</code>).<br/>
                    <strong>Modeller:</strong> Seçenekleri virgülle ayırarak yazın (örn: <code>Travego 15 SHD, Travego 17 SHD</code>).
                </div>
                
                {this.brandModelRules.map((rule, index) => (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                        <input className="FormControl" placeholder="Konu Yolu (Örn: d/77...)" value={rule.tagSlug} oninput={e => rule.tagSlug = e.target.value} />
                        <input className="FormControl" placeholder="Marka" value={rule.brand} oninput={e => rule.brand = e.target.value} />
                        <input className="FormControl" placeholder="Modeller (virgülle ayrılmış)" value={rule.models} oninput={e => rule.models = e.target.value} />
                        <Button className="Button Button--danger Button--icon" onclick={() => this.brandModelRules.splice(index, 1)} icon="fas fa-times"></Button>
                    </div>
                ))}
                
                <Button className="Button" onclick={() => this.brandModelRules.push({tagSlug: '', brand: '', models: ''})} icon="fas fa-plus">
                    Yeni Eşleştirme Ekle
                </Button>
            </div>

            <div className="Form-group" style={{ marginTop: '20px' }}>
                <Button className="Button Button--primary" onclick={this.save.bind(this)}>
                    Ayarları Kaydet
                </Button>
            </div>
          </div>

          <div className="Form-group" style={{ marginTop: '30px', padding: '15px', background: '#f8f9fa', borderRadius: '5px', border: '1px solid #e9ecef' }}>
            <h3 className="Settings-title" style={{ marginBottom: '10px' }}>SEO ve Toplu İşlemler</h3>
            <div className="helpText" style={{ marginBottom: '15px' }}>
                Forumda daha önceden yüklenmiş tüm fotoğrafları tarar. Mesaj içerisine girilmiş olan künye bilgilerini bularak fotoğrafların ALT etiketlerine otomatik olarak uygular.
            </div>
            <Button 
                className="Button Button--warning" 
                loading={this.isUpdatingTags} 
                onclick={this.updateTags.bind(this)}
                icon="fas fa-sync-alt"
            >
                Eski ALT Etiketlerini Şimdi Güncelle
            </Button>
          </div>

          <hr style={{ marginTop: '30px' }} />

          <div className="MediaManager-section" style={{marginTop: '30px'}}>
            
            <div className="MediaManager-header" style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '20px', 
                flexWrap: 'wrap', 
                gap: '15px'
            }}>
                <h3 className="Settings-title" style={{margin: 0}}>Medya Yönetimi</h3>
                
                <div className="MediaManager-search" style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                    <input 
                        className="FormControl" 
                        type="text" 
                        placeholder="Dosya adı veya kullanıcı adı ile ara..." 
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
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: '10px',
                marginBottom: '20px'
            }}>
                {this.isLoading ? (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '20px'}}>
                        <LoadingIndicator />
                    </div>
                ) : this.images.length === 0 ? (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', color: '#999', padding: '20px', fontStyle: 'italic'}}>
                        Kriterlere uygun görsel bulunamadı.
                    </div>
                ) : (
                    this.images.map(image => {
                        const thumbUrl = image.attributes.thumb_path || image.attributes.url;
                        const isEditing = this.editingImageId === image.id;
                        const filenameWithoutExt = image.attributes.filename ? image.attributes.filename.replace(/\.[^/.]+$/, '') : '';
                        
                        return (
                            <div className="MediaManager-card" style={{
                                background: '#fff',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    height: '110px', 
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
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover', 
                                                display: 'block'
                                            }}
                                        />
                                    </a>
                                </div>

                                <div style={{padding: '8px', fontSize: '11px', flexGrow: 1}}>
                                    {isEditing ? (
                                        <div style={{marginBottom: '5px'}}>
                                            <input
                                                className="FormControl"
                                                type="text"
                                                value={this.editingName}
                                                oninput={e => { this.editingName = e.target.value; }}
                                                onkeydown={e => {
                                                    if (e.key === 'Enter') this.saveImageName(image);
                                                    if (e.key === 'Escape') this.cancelEditName();
                                                }}
                                                style={{
                                                    fontSize: '11px',
                                                    padding: '3px 5px',
                                                    width: '100%',
                                                    boxSizing: 'border-box'
                                                }}
                                                oncreate={vnode => { vnode.dom.focus(); vnode.dom.select(); }}
                                            />
                                            <div style={{display: 'flex', gap: '3px', marginTop: '4px'}}>
                                                <Button
                                                    className="Button Button--primary Button--small"
                                                    loading={this.isSavingName}
                                                    onclick={() => this.saveImageName(image)}
                                                    style={{fontSize: '10px', padding: '2px 6px', flex: 1}}
                                                >
                                                    <i className="fas fa-check"></i>
                                                </Button>
                                                <Button
                                                    className="Button Button--small"
                                                    onclick={() => this.cancelEditName()}
                                                    style={{fontSize: '10px', padding: '2px 6px', flex: 1}}
                                                    disabled={this.isSavingName}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div title={image.attributes.filename} style={{
                                            fontWeight: 'bold', 
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis',
                                            marginBottom: '3px'
                                        }}>
                                            {image.attributes.filename}
                                        </div>
                                    )}
                                    <div style={{color: '#666', marginBottom: '2px'}}>
                                        <i className="fas fa-user"></i> {image.attributes.username}
                                    </div>
                                    <div style={{color: '#999'}}>
                                        <i className="fas fa-clock"></i> {image.attributes.createdAt}
                                    </div>
                                </div>

                                <div style={{padding: '5px', background: '#fafafa', borderTop: '1px solid #eee', display: 'flex', gap: '3px'}}>
                                    <Button 
                                        className="Button Button--small" 
                                        icon="fas fa-pen"
                                        onclick={() => this.startEditName(image, filenameWithoutExt)}
                                        style={{fontSize: '10px', padding: '4px 6px', flex: 1, color: '#2196F3', borderColor: '#2196F3'}}
                                        disabled={this.isSavingName}
                                        title="Dosya Adı Düzenle"
                                    >
                                        Düzenle
                                    </Button>
                                    <Button 
                                        className="Button Button--danger Button--small" 
                                        icon="fas fa-trash-alt"
                                        onclick={() => this.deleteImage(image)}
                                        style={{fontSize: '10px', padding: '4px 6px', flex: 1}}
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

            <div className="MediaManager-footer" style={{
                marginTop: '10px', 
                display: 'flex', 
                justifyContent: 'center', 
                gap: '15px', 
                alignItems: 'center',
                paddingBottom: '30px'
            }}>
                <Button 
                    className="Button" 
                    icon="fas fa-chevron-left"
                    disabled={this.offset === 0} 
                    onclick={() => this.changePage(-1)}
                >
                    Önceki
                </Button>

                <span style={{fontWeight: 'bold', color: '#666'}}>
                    {this.images.length > 0 ? `${this.offset + 1} - ${this.offset + this.images.length}` : '0'}
                </span>

                <Button 
                    className="Button" 
                    icon="fas fa-chevron-right"
                    disabled={this.images.length < this.limit} 
                    onclick={() => this.changePage(1)}
                >
                    Sonraki
                </Button>
            </div>

          </div>
        </div>
      </div>
    ];
  }

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
      app.alerts.show({ type: 'error' }, 'Dosya adı boş olamaz.');
      return;
    }

    const currentNameWithoutExt = image.attributes.filename ? image.attributes.filename.replace(/\.[^/.]+$/, '') : '';
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
      
      app.alerts.show({ type: 'success' }, `Dosya adı "${response.filename}" olarak güncellendi. Firebase ve mesajlar da güncellendi.`);
      
      this.editingImageId = null;
      this.editingName = '';
      this.isSavingName = false;
      m.redraw();
    }).catch(error => {
      const errorMsg = error && error.responseJSON && error.responseJSON.error
        ? error.responseJSON.error
        : 'Dosya adı değiştirilemedi. Lütfen tekrar deneyin.';
      app.alerts.show({ type: 'error' }, errorMsg);
      this.isSavingName = false;
      m.redraw();
    });
  }

  save() {
    if (!this.settings['framio-upload-exif.brand_models']) {
        this.settings['framio-upload-exif.brand_models'] = Stream('');
    }
    this.settings['framio-upload-exif.brand_models'](JSON.stringify(this.brandModelRules));

    saveSettings(this.settings)
      .then(() => app.alerts.show({ type: 'success' }, 'Ayarlar kaydedildi.'));
  }

  updateTags() {
    if (!confirm('Tüm mevcut fotoğrafların ALT etiketleri mesajlardaki künye bilgileriyle değiştirilecek. Bu işlem mesaj sayısına göre zaman alabilir. Onaylıyor musunuz?')) return;

    this.isUpdatingTags = true;
    m.redraw();

    app.request({
        method: 'POST',
        url: app.forum.attribute('apiUrl') + '/framio-update-alt-tags'
    }).then(response => {
        app.alerts.show({ type: 'success' }, `İşlem tamamlandı. Toplam ${response.updated_count} mesajın ALT etiketi güncellendi.`);
    }).catch(error => {
        app.alerts.show({ type: 'error' }, 'İşlem sırasında bir hata oluştu. Lütfen konsolu kontrol edin.');
    }).finally(() => {
        this.isUpdatingTags = false;
        m.redraw();
    });
  }

  performSearch() {
    this.offset = 0;
    this.loadImages();
  }

  changePage(direction) {
    this.offset += direction * this.limit;
    if (this.offset < 0) this.offset = 0;
    this.loadImages();
  }

  loadImages() {
    this.isLoading = true;
    this.images = []; 
    m.redraw();

    const params = {
        page: { offset: this.offset, limit: this.limit }
    };

    if (this.searchQuery) {
        params.filter = { q: this.searchQuery };
    }

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
            let username = 'Misafir / Silinmiş';
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

  deleteImage(image) {
    if (!confirm(`${image.attributes.filename} dosyasını silmek istediğinize emin misiniz?`)) return;

    app.request({
        method: 'DELETE',
        url: app.forum.attribute('apiUrl') + '/framio-image/' + image.id
    }).then(() => {
        this.images = this.images.filter(i => i.id !== image.id);
        app.alerts.show({ type: 'success' }, 'Görsel silindi.');
        
        if (this.images.length === 0 && this.offset > 0) {
            this.changePage(-1);
        } else {
            m.redraw();
        }
    });
  }
}