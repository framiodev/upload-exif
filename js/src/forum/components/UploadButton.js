import Component from 'flarum/common/Component';
import icon from 'flarum/common/helpers/icon';
import app from 'flarum/forum/app';
import Tooltip from 'flarum/common/components/Tooltip';
import WatermarkModal from './WatermarkModal';
import AttributeModal from './AttributeModal';
import InfoModal from './InfoModal';

export default class UploadButton extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.loading = false;
  }

  view() {
    let buttonClasses = 'Button framio-upload-button hasIcon';

    if (!this.loading) {
        buttonClasses += ' Button--link Button--icon';
    }

    return (
      <Tooltip text={this.loading ? '' : 'Fotoğraf Yükle'}> 
        <button 
            className={buttonClasses}
            type="button"
            onclick={() => !this.loading && this.element.querySelector('input').click()}
        >
            {this.loading ? icon('fas fa-spinner fa-spin') : icon('fas fa-camera')}
            
            <span className="Button-label">
                {this.loading ? ' Yükleniyor...' : 'Fotoğraf Yükle'}
            </span>

            <input 
                type="file" 
                multiple 
                accept="image/*" 
                style="display:none" 
                onchange={this.process.bind(this)} 
            />
        </button>
      </Tooltip>
    );
  }

  process(e) {
    const fileList = Array.from(e.target.files);
    if (fileList.length === 0) return;

    fileList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

    app.modal.show(WatermarkModal, {
        files: fileList,
        onconfirm: (watermarkData, updatedFiles) => {
            const finalFiles = updatedFiles || fileList;
            this.openAttributeStep(finalFiles, watermarkData);
        }
    });

    e.target.value = '';
  }

  openAttributeStep(fileList, watermarkData, savedValues = {}) {
      app.modal.show(AttributeModal, {
          file: fileList[0],
          initialValues: savedValues,
          onsubmit: (attributeText) => {
              this.startUpload(fileList, watermarkData, attributeText, null);
          },
          onskip: () => {
              this.startUpload(fileList, watermarkData, null, null);
          },
          onInfo: (currentAttributeText, currentRawData) => {
              app.modal.show(InfoModal, {
                  onsubmit: (infoText) => {
                      this.startUpload(fileList, watermarkData, currentAttributeText, infoText);
                  },
                  onback: () => {
                      this.openAttributeStep(fileList, watermarkData, currentRawData);
                  }
              });
          }
      });
  }

  startUpload(fileList, watermarkData, attributeText, infoText) {
    this.loading = true;
    m.redraw();

    const isArrayWatermark = Array.isArray(watermarkData);

    const uploads = fileList.map((file, index) => {
        const wmType = isArrayWatermark ? watermarkData[index] : watermarkData;
        return this.uploadFile(file, wmType);
    });

    Promise.all(uploads)
      .then(results => {
        
        // 1. Künye Metnini Temizle ve Tek Satıra Dönüştür
        let cleanAltText = '';
        if (attributeText) {
            cleanAltText = attributeText
                .replace(/- \*\*/g, '')  // Başlangıç liste karakterini sil
                .replace(/\*\*/g, '')    // Bitiş kalınlaştırma karakterini sil
                .split('\n')             // Satırları ayır
                .filter(Boolean)         // Boş satırları at
                .join(' - ')             // Aralarına tire koyarak birleştir
                .trim();                 // Baş/son boşlukları temizle
        }

        // 2. BBCode İçerisindeki alt="" Etiketini Güncelle
        const validCodes = results.filter(code => code !== null).map(code => {
            if (cleanAltText) {
                // Tırnak ve köşeli parantezleri temizleyerek güvenli bir string oluştur
                let finalAlt = cleanAltText.replace(/["\[\]]/g, '');
                
                // Mevcut alt="eski_deger" kısmını bizim temizlenmiş künye ile değiştir
                return code.replace(/alt=(?:"[^"]*"|[^\]\s]+)/, `alt="${finalAlt}"`);
            }
            return code;
        });
        
        // 3. Editöre Yazdır
        if (validCodes.length > 0) {
            let textToInsert = '';
            textToInsert += validCodes.join('\n');
            
            if (attributeText) {
                textToInsert += '\n\n' + attributeText;
            }

            if (infoText) {
                textToInsert += '\n\n' + infoText;
            }
            
            textToInsert += '\n';
            
            if (this.attrs.editor && typeof this.attrs.editor.insertAtCursor === 'function') {
                this.attrs.editor.insertAtCursor(textToInsert);
            } else if (app.composer && app.composer.editor && typeof app.composer.editor.insertAtCursor === 'function') {
                app.composer.editor.insertAtCursor(textToInsert);
            } else {
                app.alerts.show({ type: 'error' }, 'Fotoğraf yüklendi ama editöre eklenemedi.');
            }

        } else {
            app.alerts.show({ type: 'error' }, 'Yükleme başarısız oldu.');
        }
      })
      .catch(err => {
        console.error(err);
        app.alerts.show({ type: 'error' }, 'Bir hata oluştu.');
      })
      .finally(() => {
        this.loading = false;
        m.redraw();
      });
  }

  uploadFile(file, watermarkType) {
    const data = new FormData();
    data.append('framio_image', file);
    data.append('watermark_type', watermarkType);

    const csrfToken = app.session.csrfToken;

    return fetch(app.forum.attribute('apiUrl') + '/framio-upload', {
        method: 'POST',
        body: data,
        headers: { 'X-CSRF-Token': csrfToken }
    })
    .then(response => {
        if (!response.ok) throw new Error(response.statusText);
        return response.json();
    })
    .then(data => data.bbcode)
    .catch(error => {
        console.warn('Yükleme hatası:', file.name, error);
        return null;
    });
  }
}