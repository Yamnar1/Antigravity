// ===================================
// AIRCRAFT MANAGEMENT MODULE (API Version with Permissions)
// ===================================

const Aircraft = {
  // Get all aircraft from API
  async getAll() {
    try {
      const result = await API.getAircraft();
      return result.success ? result.aircraft : [];
    } catch (error) {
      console.error('Error getting aircraft:', error);
      return [];
    }
  },

  // Get statistics from API
  async getStats() {
    try {
      const result = await API.getAircraftStats();
      if (result.success) {
        const stats = result.stats;
        // Compatibility with old server version
        if (stats.withDebt === undefined && stats.debtFree !== undefined) {
          stats.withDebt = stats.total - stats.debtFree;
        }
        return stats;
      }
      return { total: 0, withDebt: 0, validAirworthiness: 0, validRadio: 0, validInsurance: 0, alerts: 0 };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, withDebt: 0, validAirworthiness: 0, validRadio: 0, validInsurance: 0, alerts: 0 };
    }
  },

  // Create new aircraft
  async create(data) {
    try {
      const result = await API.createAircraft(data);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al crear aeronave' };
    }
  },

  // Update aircraft
  async update(id, data) {
    try {
      const result = await API.updateAircraft(id, data);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al actualizar aeronave' };
    }
  },

  // Delete aircraft
  async delete(id) {
    try {
      const result = await API.deleteAircraft(id);
      return result;
    } catch (error) {
      return { success: false, message: error.message || 'Error al eliminar aeronave' };
    }
  },

  // Check certificate status
  getCertStatus(expiryDate) {
    if (!expiryDate) return { status: 'unknown', class: 'badge-info', text: 'No Especificado' };

    const today = new Date();
    // Reset to UTC midnight
    today.setUTCHours(0, 0, 0, 0);

    // Parse expiry date as UTC
    const expiryParts = expiryDate.split('-');
    const expiry = new Date(Date.UTC(expiryParts[0], expiryParts[1] - 1, expiryParts[2]));

    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', class: 'badge-danger', text: 'Vencido' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', class: 'badge-warning', text: `Por Vencer (${daysUntilExpiry}d)` };
    } else {
      return { status: 'valid', class: 'badge-success', text: 'Vigente' };
    }
  },

  // Toggle debt fields based on status
  toggleDebtFields(status) {
    const detailsGroup = document.getElementById('debtDetailsGroup');
    const amountGroup = document.getElementById('debtAmountGroup');

    if (detailsGroup) detailsGroup.style.display = status === 'authorized' ? 'block' : 'none';
    if (amountGroup) amountGroup.style.display = status === 'specific_amount' ? 'flex' : 'none';
  },

  // Search aircraft by registration (with audit)
  async searchAircraft() {
    const searchInput = document.getElementById('aircraftSearch');
    const registration = searchInput.value.trim();

    if (!registration) {
      App.showAlert('warning', 'Ingrese una matrícula para buscar');
      return;
    }

    try {
      const result = await API.request(`/aircraft/search/${encodeURIComponent(registration)}`);

      if (result.success && result.aircraft) {
        this.displayFilteredAircraft([result.aircraft]);
        App.showAlert('success', `Aeronave encontrada: ${result.aircraft.registration}`);
      }
    } catch (error) {
      // Don't log 404 to console - it's expected when searching
      if (!error.message || !error.message.includes('404')) {
        console.error('Search error:', error);
      }
      App.showAlert('danger', 'Aeronave no encontrada');
      this.displayFilteredAircraft([]);
    }
  },

  // Clear search and show all aircraft
  async clearSearch() {
    const searchInput = document.getElementById('aircraftSearch');
    searchInput.value = '';

    const aircraft = await this.getAll();
    this.displayFilteredAircraft(aircraft);
    App.showAlert('info', 'Búsqueda limpiada');
  },

  // Filter aircraft by type (debt, expired certs, etc)
  async filterAircraftByType(filterType) {
    const aircraft = await this.getAll();
    let filtered = [];
    let message = '';

    switch (filterType) {
      case 'debt':
        filtered = aircraft.filter(a => a.debt_status !== 'paid');
        message = `Mostrando ${filtered.length} aeronave(s) con deuda`;
        break;
      case 'expired':
        filtered = aircraft.filter(a => {
          const air = this.getCertStatus(a.airworthiness_expiry).status === 'expired';
          const radio = this.getCertStatus(a.radio_station_expiry).status === 'expired';
          const insurance = this.getCertStatus(a.insurance_expiry).status === 'expired';
          const acoustic = this.getCertStatus(a.acoustic_expiry).status === 'expired';
          return air || radio || insurance || acoustic;
        });
        message = `Mostrando ${filtered.length} aeronave(s) con certificados vencidos`;
        break;
      case 'alerts':
        filtered = aircraft.filter(a => {
          const hasDebt = a.debt_status !== 'paid';
          const hasExpiredCerts =
            this.getCertStatus(a.airworthiness_expiry).status === 'expired' ||
            this.getCertStatus(a.radio_station_expiry).status === 'expired' ||
            this.getCertStatus(a.insurance_expiry).status === 'expired' ||
            this.getCertStatus(a.acoustic_expiry).status === 'expired';
          return hasDebt || hasExpiredCerts;
        });
        message = `Mostrando ${filtered.length} aeronave(s) con alertas`;
        break;
      case 'all':
      default:
        filtered = aircraft;
        message = `Mostrando todas las aeronaves (${filtered.length})`;
        break;
    }

    this.displayFilteredAircraft(filtered);
    App.showAlert('info', message);
  },

  // Display filtered aircraft list
  displayFilteredAircraft(aircraft) {
    const tbody = document.getElementById('aircraftTableBody');
    if (!tbody) return;

    const canEdit = Auth.hasAnyPermission(
      PERMISSIONS.MANAGE_AIRCRAFT_BASIC,
      PERMISSIONS.MANAGE_DEBT,
      PERMISSIONS.MANAGE_INSURANCE,
      PERMISSIONS.MANAGE_AIRWORTHINESS,
      PERMISSIONS.MANAGE_RADIO
    );
    const canDelete = Auth.hasPermission(PERMISSIONS.DELETE_AIRCRAFT);

    if (aircraft.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No se encontraron aeronaves</td></tr>';
      return;
    }

    tbody.innerHTML = aircraft.map(a => {
      let debtHtml = '';
      if (a.debt_status === 'paid') {
        debtHtml = '<span class="badge badge-success">Al Día</span>';
      } else if (a.debt_status === 'pending') {
        debtHtml = '<span class="badge badge-danger">Pendiente</span>';
      } else if (a.debt_status === 'authorized') {
        debtHtml = `<span class="badge badge-warning" title="${a.debt_details || ''}">Autorizada</span>`;
      } else if (a.debt_status === 'specific_amount') {
        debtHtml = `<span class="badge badge-warning">${a.debt_amount} ${a.debt_currency}</span>`;
      }

      const airStatus = this.getCertStatus(a.airworthiness_expiry);
      const radioStatus = this.getCertStatus(a.radio_station_expiry);
      const insuranceStatus = this.getCertStatus(a.insurance_expiry);
      const acousticStatus = this.getCertStatus(a.acoustic_expiry);

      return `
        <tr>
          <td><strong>${a.registration}</strong></td>
          <td>${a.manufacturer} ${a.model}</td>
          <td>${debtHtml}</td>
          <td><span class="badge ${airStatus.class}">${airStatus.text}</span></td>
          <td><span class="badge ${radioStatus.class}">${radioStatus.text}</span></td>
          <td><span class="badge ${insuranceStatus.class}">${insuranceStatus.text}</span></td>
          <td>${a.registration_date || '-'}</td>
          <td><span class="badge ${acousticStatus.class}">${acousticStatus.text}</span></td>
          ${canEdit || canDelete ? `
            <td>
              <button class="btn btn-sm btn-primary" onclick="Aircraft.showViewModal(${a.id})">👁️ Ver</button>
              ${canEdit ? `<button class="btn btn-sm btn-secondary" onclick="Aircraft.showEditModal(${a.id})">✏️ Editar</button>` : ''}
              ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="Aircraft.confirmDelete(${a.id})">🗑️ Eliminar</button>` : ''}
            </td>
          ` : ''}
        </tr>
      `;
    }).join('');
  },

  // Render aircraft list
  renderList() {
    const canCreate = Auth.hasPermission(PERMISSIONS.CREATE_AIRCRAFT);
    const canDelete = Auth.hasPermission(PERMISSIONS.DELETE_AIRCRAFT);
    const canEdit = Auth.hasAnyPermission(
      PERMISSIONS.MANAGE_AIRCRAFT_BASIC,
      PERMISSIONS.MANAGE_DEBT,
      PERMISSIONS.MANAGE_INSURANCE,
      PERMISSIONS.MANAGE_AIRWORTHINESS,
      PERMISSIONS.MANAGE_RADIO
    );

    let html = `
      <div class="stats-grid" id="aircraftStatsGrid">
        <div class="stat-card">
          <div class="stat-icon">✈️</div>
          <div class="stat-content">
            <div class="stat-label">Total Aeronaves</div>
            <div class="stat-value">-</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-content">
            <div class="stat-label">Con Deuda</div>
            <div class="stat-value">-</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-content">
            <div class="stat-label">Cert. Vigentes</div>
            <div class="stat-value">-</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⚠️</div>
          <div class="stat-content">
            <div class="stat-label">Alertas</div>
            <div class="stat-value">-</div>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <input type="text" class="form-input search-input" id="aircraftSearch" placeholder="🔍 Buscar por matrícula..." onkeypress="if(event.key==='Enter') Aircraft.searchAircraft()">
        <button class="btn btn-secondary" onclick="Aircraft.searchAircraft()">🔍 Buscar</button>
        <button class="btn btn-secondary" onclick="Aircraft.clearSearch()" style="margin-left: 5px;">✕ Limpiar</button>
        ${canCreate ? '<button class="btn btn-primary" onclick="Aircraft.showCreateModal()">➕ Nueva Aeronave</button>' : ''}
      </div>

      <div class="table-container">
        <table class="table bordered-table">
          <thead>
            <tr>
              <th>Matrícula</th>
              <th>Modelo</th>
              <th>Deuda</th>
              <th>Aeronavegabilidad</th>
              <th>Lic. Estación de Radio</th>
              <th>Póliza de Seguro</th>
              <th>Cert. Matrícula</th>
              <th>Homol. Acústica</th>
              ${canEdit || canDelete ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody id="aircraftTableBody">
            <tr><td colspan="9" style="text-align: center;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    `;

    setTimeout(async () => {
      const [aircraft, stats] = await Promise.all([this.getAll(), this.getStats()]);

      // Calculate stats client-side to ensure consistency and handle stale server response
      const clientStats = {
        total: aircraft.length,
        withDebt: aircraft.filter(a => a.debt_status !== 'paid').length,
        expiredCerts: aircraft.filter(a => {
          const air = this.getCertStatus(a.airworthiness_expiry).status === 'expired';
          const radio = this.getCertStatus(a.radio_station_expiry).status === 'expired';
          const insurance = this.getCertStatus(a.insurance_expiry).status === 'expired';
          const acoustic = this.getCertStatus(a.acoustic_expiry).status === 'expired';
          return air || radio || insurance || acoustic;
        }).length,
        alerts: 0 // Will be calculated below
      };

      // Calculate alerts: Count unique aircraft that have EITHER debt OR expired certs
      clientStats.alerts = aircraft.filter(a => {
        const hasDebt = a.debt_status !== 'paid';
        const hasExpiredCerts =
          this.getCertStatus(a.airworthiness_expiry).status === 'expired' ||
          this.getCertStatus(a.radio_station_expiry).status === 'expired' ||
          this.getCertStatus(a.insurance_expiry).status === 'expired' ||
          this.getCertStatus(a.acoustic_expiry).status === 'expired';
        return hasDebt || hasExpiredCerts;
      }).length;

      // Use client stats directly for the module view to ensure consistency with the table
      // This ignores the server stats response which might be stale or calculated differently
      const finalStats = clientStats;

      const statsGrid = document.getElementById('aircraftStatsGrid');
      if (statsGrid) {
        statsGrid.innerHTML = `
          <div class="stat-card clickable-card" onclick="Aircraft.filterAircraftByType('all')" title="Click para ver todas las aeronaves">
            <div class="stat-icon">✈️</div>
            <div class="stat-content">
              <div class="stat-label">Total Aeronaves</div>
              <div class="stat-value">${finalStats.total}</div>
            </div>
          </div>
          <div class="stat-card clickable-card" onclick="Aircraft.filterAircraftByType('debt')" title="Click para filtrar aeronaves con deuda">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <div class="stat-label">Con Deuda</div>
              <div class="stat-value">${finalStats.withDebt}</div>
            </div>
          </div>
          <div class="stat-card clickable-card" onclick="Aircraft.filterAircraftByType('expired')" title="Click para filtrar certificados vencidos">
            <div class="stat-icon">📋</div>
            <div class="stat-content">
              <div class="stat-label">Cert. Vencidos</div>
              <div class="stat-value">${finalStats.expiredCerts}</div>
            </div>
          </div>
          <div class="stat-card clickable-card" onclick="Aircraft.filterAircraftByType('alerts')" title="Click para filtrar alertas">
            <div class="stat-icon">⚠️</div>
            <div class="stat-content">
              <div class="stat-label">Alertas</div>
              <div class="stat-value">${finalStats.alerts}</div>
            </div>
          </div>
        `;
      }

      this.displayFilteredAircraft(aircraft);
    }, 0);

    return html;
  },

  // Show create modal
  showCreateModal() {
    const canManageBasic = Auth.hasPermission(PERMISSIONS.MANAGE_AIRCRAFT_BASIC);
    const canManageDebt = Auth.hasPermission(PERMISSIONS.MANAGE_DEBT);
    const canManageInsurance = Auth.hasPermission(PERMISSIONS.MANAGE_INSURANCE);
    const canManageAirworthiness = Auth.hasPermission(PERMISSIONS.MANAGE_AIRWORTHINESS);
    const canManageRadio = Auth.hasPermission(PERMISSIONS.MANAGE_RADIO);

    const modal = `
      <div class="modal-overlay" id="aircraftModal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Registrar Nueva Aeronave</h3>
            <button class="modal-close" onclick="App.closeModal('aircraftModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="aircraftForm" onsubmit="Aircraft.handleSubmit(event)">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Matrícula *</label>
                  <input type="text" class="form-input" name="registration" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Fabricante *</label>
                  <input type="text" class="form-input" name="manufacturer" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Modelo *</label>
                  <input type="text" class="form-input" name="model" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Número de Serie</label>
                  <input type="text" class="form-input" name="serial_number" ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Estado de Deuda</h4>
              <div class="form-group">
                <label class="form-label">Estado de Deuda *</label>
                <select class="form-select" name="debt_status" onchange="Aircraft.toggleDebtFields(this.value)" required ${!canManageDebt ? 'disabled' : ''}>
                  <option value="paid">Al Día</option>
                  <option value="pending">Pendiente</option>
                  <option value="authorized">Autorizada</option>
                  <option value="specific_amount">Monto Específico</option>
                </select>
              </div>
              <div id="debtDetailsGroup" style="display: none;">
                <div class="form-group">
                  <label class="form-label">Detalles de Deuda Autorizada</label>
                  <textarea class="form-input" name="debt_details" rows="2" ${!canManageDebt ? 'disabled' : ''}></textarea>
                </div>
              </div>
              <div id="debtAmountGroup" class="form-row" style="display: none;">
                <div class="form-group">
                  <label class="form-label">Monto de Deuda</label>
                  <input type="number" step="0.01" class="form-input" name="debt_amount" ${!canManageDebt ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Moneda</label>
                  <select class="form-select" name="debt_currency" ${!canManageDebt ? 'disabled' : ''}>
                    <option value="USD">USD</option>
                    <option value="VES">VES</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Información Adicional</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Colores Predominantes</label>
                  <input type="text" class="form-input" name="predominant_colors" placeholder="ej: Blanco/Azul">
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Uso</label>
                  <input type="text" class="form-input" name="aircraft_use_type" placeholder="ej: Privado, Comercial, Instrucción">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Aeropuerto Base</label>
                  <input type="text" class="form-input" name="base_airport" placeholder="Código ICAO o nombre">
                </div>
                <div class="form-group">
                  <label class="form-label">Detentor(es)</label>
                  <textarea class="form-input" name="holders" rows="2" placeholder="Nombres de los detentores o propietarios"></textarea>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Certificaciones</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado de Aeronavegabilidad</label>
                  <input type="text" class="form-input" name="airworthiness_cert" ${!canManageAirworthiness ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Clasificación</label>
                  <input type="text" class="form-input" name="airworthiness_classification" ${!canManageAirworthiness ? 'disabled' : ''} placeholder="ej: Normal, Transporte">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="airworthiness_expiry" ${!canManageAirworthiness ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Estación de Radio</label>
                  <input type="text" class="form-input" name="radio_station_cert" ${!canManageRadio ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="radio_station_expiry" ${!canManageRadio ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Póliza de Seguro</label>
                  <input type="text" class="form-input" name="insurance" ${!canManageInsurance ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Empresa Aseguradora</label>
                  <input type="text" class="form-input" name="insurance_company" ${!canManageInsurance ? 'disabled' : ''} placeholder="Nombre de la aseguradora">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="insurance_expiry" ${!canManageInsurance ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado de Matrícula</label>
                  <input type="text" class="form-input" name="registration_cert">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Asignación</label>
                  <input type="date" class="form-input" name="registration_date">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Homologación Acústica</label>
                  <input type="text" class="form-input" name="acoustic_cert">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="acoustic_expiry">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('aircraftModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('aircraftForm').requestSubmit()">Registrar Aeronave</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Show edit modal
  async showEditModal(aircraftId) {
    const aircraft = (await this.getAll()).find(a => a.id === aircraftId);
    if (!aircraft) return;

    const canManageBasic = Auth.hasPermission(PERMISSIONS.MANAGE_AIRCRAFT_BASIC);
    const canManageDebt = Auth.hasPermission(PERMISSIONS.MANAGE_DEBT);
    const canManageInsurance = Auth.hasPermission(PERMISSIONS.MANAGE_INSURANCE);
    const canManageAirworthiness = Auth.hasPermission(PERMISSIONS.MANAGE_AIRWORTHINESS);
    const canManageRadio = Auth.hasPermission(PERMISSIONS.MANAGE_RADIO);

    const modal = `
      <div class="modal-overlay" id="aircraftModal">
        <div class="modal">
          <div class="modal-header">
            <h3 class="modal-title">Editar Aeronave</h3>
            <button class="modal-close" onclick="App.closeModal('aircraftModal')">✕</button>
          </div>
          <div class="modal-body">
            <form id="aircraftForm" onsubmit="Aircraft.handleSubmit(event, ${aircraftId})">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Matrícula</label>
                  <input type="text" class="form-input" name="registration" value="${aircraft.registration}" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Fabricante</label>
                  <input type="text" class="form-input" name="manufacturer" value="${aircraft.manufacturer}" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Modelo</label>
                  <input type="text" class="form-input" name="model" value="${aircraft.model}" required ${!canManageBasic ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Número de Serie</label>
                  <input type="text" class="form-input" name="serial_number" value="${aircraft.serial_number || ''}" ${!canManageBasic ? 'disabled' : ''}>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Información Adicional</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Colores Predominantes</label>
                  <input type="text" class="form-input" name="predominant_colors" value="${aircraft.predominant_colors || ''}" placeholder="ej: Blanco/Azul">
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Uso</label>
                  <input type="text" class="form-input" name="aircraft_use_type" value="${aircraft.aircraft_use_type || ''}" placeholder="ej: Privado, Comercial, Instrucción">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Aeropuerto Base</label>
                  <input type="text" class="form-input" name="base_airport" value="${aircraft.base_airport || ''}" placeholder="Código ICAO o nombre">
                </div>
                <div class="form-group">
                  <label class="form-label">Detentor(es)</label>
                  <textarea class="form-input" name="holders" rows="2" placeholder="Nombres de los detentores o propietarios">${aircraft.holders || ''}</textarea>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Estado de Deuda</h4>
              <div class="form-group">
                <label class="form-label">Estado de Deuda</label>
                <select class="form-select" name="debt_status" onchange="Aircraft.toggleDebtFields(this.value)" required ${!canManageDebt ? 'disabled' : ''}>
                  <option value="paid" ${aircraft.debt_status === 'paid' ? 'selected' : ''}>Al Día</option>
                  <option value="pending" ${aircraft.debt_status === 'pending' ? 'selected' : ''}>Pendiente</option>
                  <option value="authorized" ${aircraft.debt_status === 'authorized' ? 'selected' : ''}>Autorizada</option>
                  <option value="specific_amount" ${aircraft.debt_status === 'specific_amount' ? 'selected' : ''}>Monto Específico</option>
                </select>
              </div>
              <div id="debtDetailsGroup" style="display: ${aircraft.debt_status === 'authorized' ? 'block' : 'none'};">
                <div class="form-group">
                  <label class="form-label">Detalles de Deuda Autorizada</label>
                  <textarea class="form-input" name="debt_details" rows="2" ${!canManageDebt ? 'disabled' : ''}>${aircraft.debt_details || ''}</textarea>
                </div>
              </div>
              <div id="debtAmountGroup" class="form-row" style="display: ${aircraft.debt_status === 'specific_amount' ? 'flex' : 'none'};">
                <div class="form-group">
                  <label class="form-label">Monto de Deuda</label>
                  <input type="number" step="0.01" class="form-input" name="debt_amount" value="${aircraft.debt_amount || ''}" ${!canManageDebt ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Moneda</label>
                  <select class="form-select" name="debt_currency" ${!canManageDebt ? 'disabled' : ''}>
                    <option value="USD" ${aircraft.debt_currency === 'USD' ? 'selected' : ''}>USD</option>
                    <option value="VES" ${aircraft.debt_currency === 'VES' ? 'selected' : ''}>VES</option>
                    <option value="EUR" ${aircraft.debt_currency === 'EUR' ? 'selected' : ''}>EUR</option>
                  </select>
                </div>
              </div>
              
              <h4 style="margin-top: 20px; margin-bottom: 10px;">Certificaciones</h4>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado de Aeronavegabilidad</label>
                  <input type="text" class="form-input" name="airworthiness_cert" value="${aircraft.airworthiness_cert || ''}" ${!canManageAirworthiness ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Clasificación</label>
                  <input type="text" class="form-input" name="airworthiness_classification" value="${aircraft.airworthiness_classification || ''}" ${!canManageAirworthiness ? 'disabled' : ''} placeholder="ej: Normal, Transporte">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="airworthiness_expiry" value="${aircraft.airworthiness_expiry || ''}" ${!canManageAirworthiness ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Estación de Radio</label>
                  <input type="text" class="form-input" name="radio_station_cert" value="${aircraft.radio_station_cert || ''}" ${!canManageRadio ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="radio_station_expiry" value="${aircraft.radio_station_expiry || ''}" ${!canManageRadio ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Póliza de Seguro</label>
                  <input type="text" class="form-input" name="insurance" value="${aircraft.insurance || ''}" ${!canManageInsurance ? 'disabled' : ''}>
                </div>
                <div class="form-group">
                  <label class="form-label">Empresa Aseguradora</label>
                  <input type="text" class="form-input" name="insurance_company" value="${aircraft.insurance_company || ''}" ${!canManageInsurance ? 'disabled' : ''} placeholder="Nombre de la aseguradora">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="insurance_expiry" value="${aircraft.insurance_expiry || ''}" ${!canManageInsurance ? 'disabled' : ''}>
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Certificado de Matrícula</label>
                  <input type="text" class="form-input" name="registration_cert" value="${aircraft.registration_cert || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Asignación</label>
                  <input type="date" class="form-input" name="registration_date" value="${aircraft.registration_date || ''}">
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Homologación Acústica</label>
                  <input type="text" class="form-input" name="acoustic_cert" value="${aircraft.acoustic_cert || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Fecha de Vencimiento</label>
                  <input type="date" class="form-input" name="acoustic_expiry" value="${aircraft.acoustic_expiry || ''}">
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('aircraftModal')">Cancelar</button>
            <button class="btn btn-primary" onclick="document.getElementById('aircraftForm').requestSubmit()">Guardar Cambios</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  },

  // Handle form submit
  async handleSubmit(event, aircraftId = null) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    let result;
    if (aircraftId) {
      result = await this.update(aircraftId, data);
    } else {
      result = await this.create(data);
    }

    if (result.success) {
      App.closeModal('aircraftModal');
      App.showAlert('success', aircraftId ? 'Aeronave actualizada correctamente' : 'Aeronave registrada correctamente');
      App.navigate('aircraft');
    } else {
      App.showAlert('danger', result.message);
    }
  },

  // Confirm delete
  async confirmDelete(aircraftId) {
    const aircraft = (await this.getAll()).find(a => a.id === aircraftId);
    if (!aircraft) return;

    if (confirm(`¿Estás seguro de eliminar la aeronave "${aircraft.registration}"?`)) {
      const result = await this.delete(aircraftId);
      if (result.success) {
        App.showAlert('success', 'Aeronave eliminada correctamente');
        App.navigate('aircraft');
      } else {
        App.showAlert('danger', result.message);
      }
    }
  },

  // Show view modal
  async showViewModal(aircraftId) {
    const aircraft = (await this.getAll()).find(a => a.id === aircraftId);
    if (!aircraft) return;

    const getDebtBadge = () => {
      if (aircraft.debt_status === 'paid') return '<span class="badge badge-success">Al Día</span>';
      if (aircraft.debt_status === 'pending') return '<span class="badge badge-danger">Pendiente</span>';
      if (aircraft.debt_status === 'authorized') return '<span class="badge badge-warning">Autorizada</span>';
      if (aircraft.debt_status === 'specific_amount') return `<span class="badge badge-warning">${aircraft.debt_amount} ${aircraft.debt_currency}</span>`;
      return '-';
    };

    const modal = `
      <div class="modal-overlay" id="aircraftViewModal">
        <div class="modal" style="max-width: 900px;">
          <div class="modal-header">
            <h3 class="modal-title">Detalles de Aeronave: ${aircraft.registration}</h3>
            <button class="modal-close" onclick="App.closeModal('aircraftViewModal')">✕</button>
          </div>
          <div class="modal-body">
            <div style="display: grid; gap: var(--spacing-xl);">
              
              <!-- Información Básica -->
              <div style="background: var(--bg-tertiary); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">📋 Información Básica</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                  <div><strong>Matrícula:</strong> ${aircraft.registration}</div>
                  <div><strong>Fabricante:</strong> ${aircraft.manufacturer}</div>
                  <div><strong>Modelo:</strong> ${aircraft.model}</div>
                  <div><strong>Número de Serie:</strong> ${aircraft.serial_number || '-'}</div>
                  <div><strong>Colores:</strong> ${aircraft.predominant_colors || '-'}</div>
                  <div><strong>Tipo de Uso:</strong> ${aircraft.aircraft_use_type || '-'}</div>
                  <div><strong>Aeropuerto Base:</strong> ${aircraft.base_airport || '-'}</div>
                  <div style="grid-column: 1 / -1;"><strong>Detentor(es):</strong> ${aircraft.holders || '-'}</div>
                </div>
              </div>

              <!-- Estado de Deuda -->
              <div style="background: var(--bg-tertiary); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">💰 Estado de Deuda</h4>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-md);">
                  <div><strong>Estado:</strong> ${getDebtBadge()}</div>
                  ${aircraft.debt_details ? `<div style="grid-column: 1 / -1;"><strong>Detalles:</strong> ${aircraft.debt_details}</div>` : ''}
                </div>
              </div>

              <!-- Certificaciones -->
              <div style="background: var(--bg-tertiary); padding: var(--spacing-lg); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <h4 style="margin-bottom: var(--spacing-md); color: var(--primary-color);">📜 Certificaciones</h4>
                <div style="display: grid; gap: var(--spacing-md);">
                  
                  <div style="padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <strong>Certificado de Aeronavegabilidad:</strong> ${aircraft.airworthiness_cert || '-'}<br>
                    ${aircraft.airworthiness_classification ? `<strong>Clasificación:</strong> ${aircraft.airworthiness_classification}<br>` : ''}
                    <strong>Vencimiento:</strong> ${aircraft.airworthiness_expiry || '-'} 
                    ${aircraft.airworthiness_expiry ? `<span class="badge ${this.getCertStatus(aircraft.airworthiness_expiry).class}">${this.getCertStatus(aircraft.airworthiness_expiry).text}</span>` : ''}
                  </div>

                  <div style="padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <strong>Estación de Radio:</strong> ${aircraft.radio_station_cert || '-'}<br>
                    <strong>Vencimiento:</strong> ${aircraft.radio_station_expiry || '-'}
                    ${aircraft.radio_station_expiry ? `<span class="badge ${this.getCertStatus(aircraft.radio_station_expiry).class}">${this.getCertStatus(aircraft.radio_station_expiry).text}</span>` : ''}
                  </div>

                  <div style="padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <strong>Póliza de Seguro:</strong> ${aircraft.insurance || '-'}<br>
                    ${aircraft.insurance_company ? `<strong>Aseguradora:</strong> ${aircraft.insurance_company}<br>` : ''}
                    <strong>Vencimiento:</strong> ${aircraft.insurance_expiry || '-'}
                    ${aircraft.insurance_expiry ? `<span class="badge ${this.getCertStatus(aircraft.insurance_expiry).class}">${this.getCertStatus(aircraft.insurance_expiry).text}</span>` : ''}
                  </div>

                  <div style="padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <strong>Certificado de Matrícula:</strong> ${aircraft.registration_cert || '-'}<br>
                    <strong>Fecha de Asignación:</strong> ${aircraft.registration_date || '-'}
                  </div>

                  <div style="padding: var(--spacing-sm); background: var(--bg-secondary); border-radius: var(--radius-sm);">
                    <strong>Homologación Acústica:</strong> ${aircraft.acoustic_cert || '-'}<br>
                    <strong>Vencimiento:</strong> ${aircraft.acoustic_expiry || '-'}
                    ${aircraft.acoustic_expiry ? `<span class="badge ${this.getCertStatus(aircraft.acoustic_expiry).class}">${this.getCertStatus(aircraft.acoustic_expiry).text}</span>` : ''}
                  </div>

                </div>
              </div>

            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" onclick="App.closeModal('aircraftViewModal')">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);
  }
};
