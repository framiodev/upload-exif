import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import Stream from 'flarum/common/utils/Stream';
import app from 'flarum/forum/app';

export default class AttributeModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);

    const initial = this.attrs.initialValues || {};
    this.currentFile = this.attrs.file; 

    this.onsubmitCallback = this.attrs.onsubmit;
    this.onskipCallback = this.attrs.onskip;
    this.onInfoCallback = this.attrs.onInfo;

    this.customFields = [];
    this.fieldValues = {};

    let rawFields = app.forum.attribute('framioCustomFields');
    try {
        if (rawFields) {
            const parsed = JSON.parse(rawFields);
            if (Array.isArray(parsed)) {
                this.customFields = parsed;
            }
        }
    } catch(e) {
        console.error("CustomFields parse error:", e);
    }

    const currentRoute = window.location.pathname || '';

    // Filter fields to those matching the current tag slug (if defined)
    const validFields = [];
    for (let field of this.customFields) {
        if (!field.label || field.label.trim() === '') continue;

        let shouldShow = true;
        if (field.tags && field.tags.trim() !== '') {
            shouldShow = currentRoute.includes(field.tags.trim());
        }

        if (shouldShow) {
            validFields.push(field);
            
            // Generate field key from label
            const fieldKey = this.generateFieldKey(field.label);
            this.fieldValues[fieldKey] = {
                stream: Stream(initial[fieldKey] || ''),
                label: field.label,
                options: field.options ? field.options.split(',').map(s => s.trim()).filter(Boolean) : []
            };
        }
    }

    this.activeFields = validFields;
  }

  generateFieldKey(label) {
      if (!label) return 'unknown';
      // Normalize english/turkish characters and make it safe
      return label.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '_');
  }

  className() {
    return 'AttributeModal Modal--large';
  }

  title() {
    return 'Görsel Etiketleri (Künye)';
  }

  content() {
    const labelStyle = "display: block; min-height: 25px; margin-bottom: 6px; font-weight: bold; font-size: 13px; color: #333;";

    // Split fields into chunks of 2 for row display
    const fieldRows = [];
    const keys = Object.keys(this.fieldValues);
    for (let i = 0; i < keys.length; i += 2) {
        fieldRows.push(keys.slice(i, i + 2));
    }

    return (
      <div className="Modal-body">
        <div className="Form-group">
            <p className="helpText" style="margin-bottom: 25px; font-size: 14px; color: #666; text-align: center;">
                Fotoğraflar arka planda yükleniyor. Gerekli detayları tanımlayabilirsiniz.<br/>
                <i style="font-size: 12px; color: #999;">(Boş bırakılan alanlar şablonda gösterilmez)</i>
            </p>

            {fieldRows.map(rowKeys => (
                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                    {rowKeys.map(key => {
                        const field = this.fieldValues[key];
                        return (
                            <div style="flex: 1;">
                                <label style={labelStyle}>{field.label}</label>
                                {field.options && field.options.length > 0 ? (
                                    <select className="FormControl" onchange={e => field.stream(e.target.value)} value={field.stream()}>
                                        <option value="">-- Seçiniz --</option>
                                        {field.options.map(opt => <option value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input className="FormControl" bidi={field.stream} />
                                )}
                            </div>
                        );
                    })}
                    {rowKeys.length === 1 && <div style="flex: 1;"></div> /* Spacer for uneven rows */}
                </div>
            ))}

            {keys.length === 0 && (
                <div style="text-align: center; padding: 20px; color: #888;">
                    Tanımlanmış özel alan bulunmuyor. Bu ekranı geçebilirsiniz.
                </div>
            )}
            
            <div className="Form-group" style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px;">
                 <Button className="Button Button--primary" style="background-color: #3498db; border-color: #3498db;" icon="fas fa-info-circle" onclick={this.goToInfo.bind(this)}>
                    Ek Metin (Info) Ekle
                 </Button>

                 <div style="display: flex; gap: 10px;">
                    <Button className="Button Button--text" onclick={this.skip.bind(this)}>
                        {keys.length === 0 ? 'Geç' : 'Künye Ekleme'}
                    </Button>
                    <Button className="Button Button--primary" onclick={this.submit.bind(this)}>
                        Bilgileri Onayla
                    </Button>
                 </div>
            </div>
        </div>
      </div>
    );
  }

  getRawData() {
      const data = {};
      Object.keys(this.fieldValues).forEach(key => {
          data[key] = this.fieldValues[key].stream();
      });
      return data;
  }

  prepareData() {
    const lines = [];

    // Dynamically iterate and push non-empty values
    Object.keys(this.fieldValues).forEach(key => {
        const field = this.fieldValues[key];
        const val = field.stream();
        if (val && val.trim() !== '') {
            lines.push(`- **${field.label}:** ${val}`);
        }
    });

    return lines.length > 0 ? lines.join('\n') : null;
  }

  submit(e) {
    if (e) e.preventDefault();
    const resultText = this.prepareData();
    if (this.onsubmitCallback) this.onsubmitCallback(resultText);
    app.modal.close();
  }

  goToInfo(e) {
      if (e) e.preventDefault();
      const resultText = this.prepareData();
      const rawData = this.getRawData();
      
      if (this.onInfoCallback) this.onInfoCallback(resultText, rawData);
  }

  skip() {
      if (this.onskipCallback) this.onskipCallback();
      app.modal.close();
  }

  hide() {
      this.skip();
  }
}