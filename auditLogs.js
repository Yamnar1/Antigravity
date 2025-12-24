const AuditLogs = {
  pagination: {
    page: 1,
    limit: 100,
    hasMore: true
  },
  currentLogs: [],

  init() {
    // Inject Global Styles for Mobile Hiding (Runs on load)
    const globalStyle = document.createElement('style');
    globalStyle.textContent = `
            @media (max-width: 768px) {
                #nav-audit-logs { display: none !important; }
            }
        `;
    document.head.appendChild(globalStyle);
  },

  // Helper: Format Date
  formatDate(dateString) {
    if (!dateString) return '-';
    // Use configured locale
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  },

  // Helper: Get Action Label
  getActionLabel(action) {
    const map = {
      'create': '<span class="badge badge-success">Crear</span>',
      'CREATE': '<span class="badge badge-success">Crear</span>',
      'update': '<span class="badge badge-warning">Editar</span>',
      'UPDATE': '<span class="badge badge-warning">Editar</span>',
      'delete': '<span class="badge badge-danger">Eliminar</span>',
      'DELETE': '<span class="badge badge-danger">Eliminar</span>',
      'view': '<span class="badge badge-info">Ver</span>',
      'VIEW': '<span class="badge badge-info">Ver</span>',
      'login': '<span class="badge badge-primary">Login</span>',
      'LOGIN': '<span class="badge badge-primary">Login</span>',
      'logout': '<span class="badge badge-secondary">Logout</span>',
      'LOGOUT': '<span class="badge badge-secondary">Logout</span>'
    };
    return map[action] || `<span class="badge badge-secondary">${action}</span>`;
  },

  // Helper: Get Resource Label
  getResourceLabel(resource) {
    const map = {
      'user': 'Usuario',
      'aircraft': 'Aeronave',
      'pilot': 'Piloto',
      'audit': 'Auditoría',
      'auth': 'Autenticación'
    };
    return map[resource] || resource;
  },

  // Helper: Translate field names from English to Spanish
  translateField(fieldName) {
    const translations = {
      // Common fields
      'name': 'Nombre',
      'email': 'Correo Electrónico',
      'phone': 'Teléfono',
      'password': 'Contraseña',
      'role': 'Rol',
      'username': 'Usuario',

      // Aircraft fields
      'registration': 'Matrícula',
      'model': 'Modelo',
      'manufacturer': 'Fabricante',
      'serial_number': 'Número de Serie',
      'year': 'Año',
      'hours': 'Horas',
      'last_inspection': 'Última Inspección',
      'next_inspection': 'Próxima Inspección',
      'insurance_expiry': 'Vencimiento Seguro',
      'airworthiness_expiry': 'Vencimiento Aeronavegabilidad',
      'status': 'Estado',

      // Pilot fields
      'id_number': 'Cédula',
      'license_number': 'Número de Licencia',
      'license_type': 'Tipo de Licencia',
      'license_expiry': 'Vencimiento Licencia',
      'medical_cert': 'Certificado Médico',
      'medical_expiry': 'Vencimiento Médico',
      'aircraft_rating_1': 'Habilitación Aeronave 1',
      'aircraft_rating_2': 'Habilitación Aeronave 2',
      'aircraft_rating_3': 'Habilitación Aeronave 3',
      'ifr_rating': 'Habilitación IFR',
      'ifr_rating_obs': 'Observaciones IFR',
      'ifr_rating_expiry': 'Vencimiento IFR',
      'language_proficiency': 'Proficiencia Idioma',
      'language_proficiency_obs': 'Observaciones Idioma',
      'language_proficiency_expiry': 'Vencimiento Idioma',
      'night_rating': 'Habilitación Nocturna',
      'night_rating_obs': 'Observaciones Nocturna',
      'night_rating_expiry': 'Vencimiento Nocturna',
      'multi_engine_rating': 'Habilitación Multimotor',
      'multi_engine_rating_obs': 'Observaciones Multimotor',
      'multi_engine_rating_expiry': 'Vencimiento Multimotor',
      'formation_rating': 'Habilitación Formación',
      'formation_rating_obs': 'Observaciones Formación',
      'formation_rating_expiry': 'Vencimiento Formación',
      'instructor_rating': 'Habilitación Instructor',
      'instructor_rating_obs': 'Observaciones Instructor',
      'instructor_rating_expiry': 'Vencimiento Instructor',

      // User fields
      'permissions': 'Permisos',
      'created_at': 'Fecha de Creación',
      'updated_at': 'Fecha de Actualización',
      'last_login': 'Último Acceso'
    };

    return translations[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  },

  // Helper: Format Details
  formatDetails(log) {
    if (!log.details) return '-';

    // Handle search queries (both found and not found)
    if (log.details.searchQuery) {
      const resourceLabel = log.resource === 'aircraft' ? 'Matrícula' : 'Piloto';
      if (log.details.notFound) {
        return `<strong>Búsqueda de ${resourceLabel}:</strong> "${log.details.searchQuery}" <span style="color: #dc3545;">(No encontrado)</span>`;
      } else if (log.details.found) {
        return `<strong>Búsqueda de ${resourceLabel}:</strong> "${log.details.searchQuery}" <span style="color: #28a745;">(Encontrado)</span>`;
      }
    }

    if (log.action === 'UPDATE' && log.details.changes) {
      const changes = log.details.changes;
      const changeList = Object.keys(changes).map(key => {
        const before = changes[key].before ?? 'null';
        const after = changes[key].after ?? 'null';
        const translatedKey = this.translateField(key);

        // Special handling for permissions field
        if (key === 'permissions') {
          // Handle both array and string formats
          let beforePerms = [];
          let afterPerms = [];

          if (Array.isArray(before)) {
            beforePerms = before;
          } else if (typeof before === 'string' && before !== 'null') {
            beforePerms = before.split(',').filter(p => p.trim());
          }

          if (Array.isArray(after)) {
            afterPerms = after;
          } else if (typeof after === 'string' && after !== 'null') {
            afterPerms = after.split(',').filter(p => p.trim());
          }

          const added = afterPerms.filter(p => !beforePerms.includes(p));
          const removed = beforePerms.filter(p => !afterPerms.includes(p));

          let permChanges = `<strong>${translatedKey}:</strong> ${beforePerms.length} → ${afterPerms.length}`;

          if (added.length > 0) {
            permChanges += `<br><span style="color: #28a745;">+ Agregados: ${added.join(', ')}</span>`;
          }
          if (removed.length > 0) {
            permChanges += `<br><span style="color: #dc3545;">- Removidos: ${removed.join(', ')}</span>`;
          }

          return permChanges;
        }

        // Normal field handling
        return `<strong>${translatedKey}:</strong> ${SecurityUtils.escapeHtml(String(before))} → ${SecurityUtils.escapeHtml(String(after))}`;
      }).join('<br>');
      return changeList || 'Sin cambios';
    } else if (log.action === 'CREATE' && log.details.data) {
      // For user creation, show permissions granted
      if (log.resource === 'user' && log.details.data) {
        const data = log.details.data;
        let perms = [];

        // Handle both array and string formats
        if (Array.isArray(data.permissions)) {
          perms = data.permissions;
        } else if (typeof data.permissions === 'string' && data.permissions !== 'null') {
          perms = data.permissions.split(',').filter(p => p.trim());
        }

        if (perms.length > 0) {
          return `<strong>Usuario creado</strong><br><span style="color: #28a745;">✓ ${perms.length} permisos otorgados:<br>${perms.join(', ')}</span>`;
        }
      }

      return 'Registro creado';
    } else if (log.action === 'DELETE' && log.details.deletedData) {
      return 'Registro eliminado';
    }

    return '-';
  },

  renderList() {
    // CHEQUEO DE DISPOSITIVO MÓVIL (Nuclear Option)
    if (window.innerWidth <= 768) {
      return `
              <div class="mobile-blocked-message" style="
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center; 
                  height: 70vh; 
                  text-align: center; 
                  padding: 20px;
                  color: white;
              ">
                  <div style="font-size: 3rem; margin-bottom: 20px;">🖥️</div>
                  <h2 style="margin-bottom: 10px; font-size: 1.5rem;">Solo Versión Escritorio</h2>
                  <p style="color: #cbd5e1; max-width: 300px; margin: 0 auto;">
                      El módulo de auditoría está deshabilitado en dispositivos móviles para garantizar la visualización correcta de los datos.
                  </p>
                  <button class="btn btn-primary" onclick="App.navigate('dashboard')" style="margin-top: 20px;">
                      Volver al Dashboard
                  </button>
              </div>
          `;
    }

    let html = `
          <style>
          /* CSS INJECTED BY JS TO FIX LAYOUT ISSUES - DESKTOP LAYOUT RESTORED */
          
          .audit-page {
              width: 100%;
              overflow-x: auto;
              background: var(--bg-secondary);
              min-height: calc(100vh - 80px); /* Fill remaining height */
              padding: 1rem;
          }
  
          /* HORIZONTAL FILTERS CONTAINER */
          .audit-filters {
              display: flex !important;
              flex-direction: row !important;
              align-items: flex-end !important;
              justify-content: space-between !important; /* Push apart */
              gap: 1.5rem !important;
              margin-bottom: 1.5rem;
              background: var(--bg-card);
              padding: 1.25rem;
              border-radius: 8px;
              border: 1px solid var(--border-color);
              width: 100%;
              box-sizing: border-box;
          }

          .form-row {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              align-items: flex-end;
              flex-grow: 1; /* Allow filters to take space */
          }

          .form-group {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              min-width: 150px;
          }
          
          /* Search input specific width */
          .form-group.search {
              flex-grow: 1;
              min-width: 200px;
          }

          .form-label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); margin-bottom: 4px; }
          .form-select, .form-input { 
              padding: 0.5rem 0.75rem; 
              border-radius: 6px; 
              border: 1px solid var(--border-color); 
              background: var(--bg-primary); 
              color: var(--text-primary); 
              width: 100%; 
              height: 38px;
              box-sizing: border-box;
          }
          
          .btn-container {
              display: flex;
              gap: 8px;
          }
          
          .btn-primary, .btn-secondary { 
              height: 38px; 
              padding: 0 1rem;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              margin-bottom: 1px;
              white-space: nowrap;
              border-radius: 6px;
              border: none;
              cursor: pointer;
              font-size: 0.875rem;
          }
          
          .btn-primary { background: var(--primary-color); color: white; }
          .btn-secondary { background: var(--bg-hover); color: var(--text-primary); border: 1px solid var(--border-color); }

            /* EXPORT BUTTONS - FIXED LAYOUT */
            .export-buttons-grid {
                 display: flex !important;
                 flex-direction: row !important;
                 gap: 12px !important;
                 align-items: flex-end !important;
                 flex-shrink: 0;
            }
            
            .export-card {
                 background: var(--bg-card);
                 border: 1px solid var(--border-color);
                 border-radius: 8px; /* Slightly more rounded */
                 padding: 0 24px !important; /* LARGE Padding */
                 display: flex;
                 align-items: center;
                 justify-content: center;
                 gap: 10px;
                 cursor: pointer;
                 transition: all 0.2s;
                 height: 59px !important; /* Extra tall for perfect fit */
                 min-width: auto;
                 white-space: nowrap;
                 flex-shrink: 0;
             }
             .export-card:hover { transform: translateY(-1px); border-color: var(--primary-color); background: rgba(37, 99, 235, 0.1); }
             .export-icon { font-size: 1.25rem; flex-shrink: 0; }
             .export-label { font-size: 0.9rem; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
             .export-card.pdf .export-icon { color: #ef4444; }
             .export-card.excel .export-icon { color: #10b981; }
             .export-card.txt .export-icon { color: #9ca3af; }

            .table-container { width: 100%; background: var(--bg-card); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; }
            .audit-page table { width: 100%; border-collapse: collapse; display: table; }
            .audit-page thead { background: rgba(255, 255, 255, 0.05); display: table-header-group; }
            .audit-page thead tr { display: table-row; }
            .audit-page tbody { display: table-row-group; }
            .audit-page tbody tr { display: table-row; border-bottom: 1px solid var(--border-color); }
            .audit-page th, .audit-page td { padding: 1rem; text-align: left; display: table-cell; vertical-align: middle; }
            .audit-page th { font-weight: 600; color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
            .audit-page td { color: var(--text-primary); font-size: 0.875rem; }
            .audit-page td::before { display: none !important; }
            .mobile-blocked-message { display: none; }
            </style>

      <div class="audit-filters">
        <div class="form-row">
          <!-- Action Filter -->
          <div class="form-group">
            <label class="form-label">Acción</label>
            <select class="form-select" id="filterAction">
              <option value="">Todas</option>
              <option value="VIEW">Ver</option>
              <option value="CREATE">Crear</option>
              <option value="UPDATE">Editar</option>
              <option value="DELETE">Eliminar</option>
            </select>
          </div>
          
          <!-- Resource Filter -->
          <div class="form-group">
            <label class="form-label">Recurso</label>
            <select class="form-select" id="filterResource">
              <option value="">Todos</option>
              <option value="aircraft">Aeronaves</option>
              <option value="pilot">Pilotos</option>
              <option value="user">Usuarios</option>
            </select>
          </div>

          <!-- Date Filter Start -->
          <div class="form-group">
             <label class="form-label">Desde</label>
             <input type="date" class="form-input" id="filterDateStart" onchange="AuditLogs.applyFilters()">
          </div>

          <!-- Date Filter End -->
          <div class="form-group">
             <label class="form-label">Hasta</label>
             <input type="date" class="form-input" id="filterDateEnd" onchange="AuditLogs.applyFilters()">
          </div>
          
          <!-- SEARCH FIELD -->
          <div class="form-group search">
            <label class="form-label">Buscar / Detalles</label>
            <input type="text" class="form-input" id="filterSearch" placeholder="Usuario, IP, detalles..." onkeypress="if(event.key === 'Enter') AuditLogs.applyFilters()">
          </div>

          <!-- Buttons -->
          <div class="form-group">
            <label class="form-label">&nbsp;</label>
            <div class="btn-container">
                <button class="btn btn-primary" onclick="AuditLogs.applyFilters()">
                    <span>🔍</span> Buscar
                </button>
                <button class="btn btn-secondary" onclick="AuditLogs.clearFilters()">
                    <span>🧹</span> Limpiar
                </button>
            </div>
          </div>
        </div>

        <div class="export-buttons-grid">
          <button class="export-card pdf" onclick="AuditLogs.exportToPDF()">
            <span class="export-icon">📕</span>
            <span class="export-label">PDF</span>
          </button>
          <button class="export-card excel" onclick="AuditLogs.exportToExcel()">
            <span class="export-icon">📊</span>
            <span class="export-label">Excel</span>
          </button>
          <button class="export-card txt" onclick="AuditLogs.exportToTXT()">
            <span class="export-icon">📄</span>
            <span class="export-label">TXT</span>
          </button>
        </div>
      </div>

      <div class="table-container" style="width: 100% !important; display: block !important;">
        <table class="table bordered-table" style="width: 100% !important; min-width: 100% !important;">
          <thead>
            <tr>
              <th>Fecha/Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Recurso</th>
              <th>Nombre/ID</th>
              <th>IP</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody id="auditLogsTableBody">
            <tr><td colspan="7" style="text-align: center;">Cargando...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="pagination-controls">
        <button class="pagination-btn" id="prevPageBtn" onclick="AuditLogs.prevPage()" disabled>
          ◀ Anterior
        </button>
        <div class="page-info" id="pageIndicator">
          Página 1
        </div>
        <button class="pagination-btn" id="nextPageBtn" onclick="AuditLogs.nextPage()" disabled>
          Siguiente ▶
        </button>
      </div>

      </div>
    `;

    // Load data asynchronously
    setTimeout(async () => {
      this.pagination.page = 1;
      await this.loadLogs();
    }, 0);

    return html;
  },

  // Apply filters
  async applyFilters() {
    this.pagination.page = 1;
    await this.loadLogs();
  },

  // Clear all filters
  async clearFilters() {
    document.getElementById('filterAction').value = '';
    document.getElementById('filterResource').value = '';
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterDateStart').value = '';
    document.getElementById('filterDateEnd').value = '';
    this.pagination.page = 1;
    await this.loadLogs();
  },

  // Pagination navigation
  async nextPage() {
    if (this.pagination.hasMore) {
      this.pagination.page++;
      await this.loadLogs();
    }
  },

  async prevPage() {
    if (this.pagination.page > 1) {
      this.pagination.page--;
      await this.loadLogs();
    }
  },

  // Update pagination controls UI
  updatePaginationUI(logsCount) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const indicator = document.getElementById('pageIndicator');

    if (prevBtn) prevBtn.disabled = this.pagination.page <= 1;

    // We assume if we got less records than limit, we are at the end
    const isLikelyEnd = logsCount < this.pagination.limit;
    this.pagination.hasMore = !isLikelyEnd;

    if (nextBtn) nextBtn.disabled = isLikelyEnd;
    if (indicator) indicator.textContent = `Página ${this.pagination.page}`;
  },

  // Load logs logic updated (SEARCH + DATES + CLIENT SIDE FILTERING)
  async loadLogs() {
    try {
      const action = document.getElementById('filterAction')?.value || '';
      const resource = document.getElementById('filterResource')?.value || '';
      const search = document.getElementById('filterSearch')?.value || '';
      const dateStart = document.getElementById('filterDateStart')?.value || '';
      const dateEnd = document.getElementById('filterDateEnd')?.value || '';

      const filters = {
        limit: (search || dateStart || dateEnd) ? 500 : this.pagination.limit, // INCREASE LIMIT FOR SEARCH/DATE to 500
        page: 1 // ALWAYS SEARCH FROM PAGE 1
      };

      // If searching, we fetch page 1 with high limit to simulate "Search All"
      if (!search && !dateStart && !dateEnd) {
        filters.page = this.pagination.page;
      }

      if (action) filters.action = action;
      if (resource) filters.resource = resource;

      const tbody = document.getElementById('auditLogsTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Aplicando filtros...</td></tr>';

      let logs = await this.getLogs(filters);

      // --- CLIENT SIDE FILTERING FALLBACK ---
      // Backend support might be limited, so we filter locally for Date Range and Search
      if ((search || dateStart || dateEnd) && logs && logs.length > 0) {

        logs = logs.filter(log => {
          let match = true;

          // Date Filtering - Robust String Comparison
          // We convert log date to "YYYY-MM-DD" local string to compare with input
          if (dateStart || dateEnd) {
            const rawDate = log.created_at || log.createdAt;
            const logDateObj = new Date(rawDate);

            // Format log date to YYYY-MM-DD in LOCAL time
            // This handles the "23 vs 24" issue by normalizing to the user's day
            const year = logDateObj.getFullYear();
            const month = String(logDateObj.getMonth() + 1).padStart(2, '0');
            const day = String(logDateObj.getDate()).padStart(2, '0');
            const logDateStr = `${year}-${month}-${day}`;
            // Pad month/day for correct string comparison if needed by locale
            // Actually clearer to use ISO split if we can trust it, but locale is safer for timezone intent

            // Let's rely on the YYYY-MM-DD format from the inputs which is ISO
            // So we must ensure logDateStr is also ISO-ish (YYYY-MM-DD)
            // The above code produces YYYY-MM-DD.

            if (dateStart) {
              // If Log Date is BEFORE Start Date string -> Exclude
              if (logDateStr < dateStart) match = false;
            }
            if (dateEnd && match) {
              // If Log Date is AFTER End Date string -> Exclude
              if (logDateStr > dateEnd) match = false;
            }
          }

          // Search Text Filtering
          if (search && match) {
            const term = search.toLowerCase();
            const searchString = [
              log.username,
              log.ipAddress,
              log.resource,
              log.action,
              this.formatDetails(log)
            ].join(' ').toLowerCase();
            if (!searchString.includes(term)) match = false;
          }

          return match;
        });
      }
      // --------------------------------------

      this.currentLogs = logs || []; // Ensure not undefined

      // Only update UI pagination if NOT searching/filtering (filtering breaks pagination logic visually)
      if (!search && !dateStart && !dateEnd) {
        this.updatePaginationUI(this.currentLogs.length);
      } else {
        // Disable pagination buttons in filtered view
        const prev = document.getElementById('prevPageBtn');
        const next = document.getElementById('nextPageBtn');
        if (prev) prev.disabled = true;
        if (next) next.disabled = true;
        const ind = document.getElementById('pageIndicator');
        if (ind) ind.textContent = `${this.currentLogs.length} Resultados`;
      }

      if (!tbody) {
        console.error('TBODY not found!');
        return;
      }

      if (this.currentLogs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">No se encontraron registros en este rango</td></tr>';
        return;
      }

      const tableContent = this.currentLogs.map(log => {
        const resourceIdentifier = log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-');
        const timestamp = log.created_at || log.createdAt;

        return `
            <tr>
              <td style="white-space:nowrap">${this.formatDate(timestamp)}</td>
              <td style="text-align:center"><strong>${SecurityUtils.escapeHtml(log.username)}</strong></td>
              <td>${this.getActionLabel(log.action)}</td>
              <td>${this.getResourceLabel(log.resource)}</td>
              <td>${SecurityUtils.escapeHtml(resourceIdentifier)}</td>
              <td>${SecurityUtils.escapeHtml(log.ipAddress) || '-'}</td>
              <td style="white-space: normal; word-break: break-word; min-width: 200px;">
                ${this.formatDetails(log)}
              </td>
            </tr>
          `;
      }).join('');

      tbody.innerHTML = tableContent;

    } catch (e) {
      console.error('CRITICAL ERROR IN LOADLOGS:', e);
      const tbody = document.getElementById('auditLogsTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="color: red; text-align: center;">Error cargando datos: ${e.message}</td></tr>`;
    }
  },

  // Export to TXT
  exportToTXT() {
    if (this.currentLogs.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    let content = '='.repeat(80) + '\n';
    content += 'REGISTRO DE AUDITORÍA - VPFS\n';
    content += 'Fecha de exportación: ' + new Date().toLocaleString('es-VE') + '\n';
    content += '='.repeat(80) + '\n\n';

    this.currentLogs.forEach((log, index) => {
      const timestamp = log.created_at || log.createdAt;
      content += `[${index + 1}] ${'-'.repeat(75)}\n`;
      content += `Fecha/Hora: ${this.formatDate(timestamp)}\n`;
      content += `Usuario: ${log.username}\n`;
      content += `Acción: ${this.getActionLabel(log.action).replace(/<[^>]*>/g, '')}\n`;
      content += `Recurso: ${this.getResourceLabel(log.resource)}\n`;
      content += `Nombre/ID: ${log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-')}\n`;
      content += `IP: ${log.ipAddress || '-'}\n`;
      content += `Detalles: ${this.formatDetails(log).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')}\n`;
      content += '\n';
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Export to Excel (CSV)
  exportToExcel() {
    if (this.currentLogs.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    let csv = '\uFEFF'; // BOM for UTF-8
    csv += 'Fecha/Hora,Usuario,Acción,Recurso,Nombre/ID,IP,Detalles\n';

    this.currentLogs.forEach(log => {
      const timestamp = log.created_at || log.createdAt;
      const details = this.formatDetails(log).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').replace(/"/g, '""');

      csv += `"${this.formatDate(timestamp)}",`;
      csv += `"${log.username}",`;
      csv += `"${this.getActionLabel(log.action).replace(/<[^>]*>/g, '')}",`;
      csv += `"${this.getResourceLabel(log.resource)}",`;
      csv += `"${log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-')}",`;
      csv += `"${log.ipAddress || '-'}",`;
      csv += `"${details}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Export to PDF (via print)
  exportToPDF() {
    if (this.currentLogs.length === 0) {
      alert('No hay registros para exportar');
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '', 'height=600,width=800');

    let html = `
      <html>
        <head>
          <title>Reporte de Auditoría</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            h1 { text-align: center; color: #333; }
            .meta { margin-bottom: 20px; text-align: right; }
          </style>
        </head>
        <body>
          <h1>Reporte de Auditoría - VPFS</h1>
          <div class="meta">Fecha: ${new Date().toLocaleString()}</div>
          <table>
            <thead>
              <tr>
                <th>Fecha/Hora</th>
                <th>Usuario</th>
                <th>Acción</th>
                <th>Recurso</th>
                <th>IP</th>
                <th>Detalles</th>
              </tr>
            </thead>
            <tbody>
    `;

    this.currentLogs.forEach(log => {
      const timestamp = log.created_at || log.createdAt;
      html += `
        <tr>
          <td>${this.formatDate(timestamp)}</td>
          <td>${log.username}</td>
          <td>${this.getActionLabel(log.action).replace(/<[^>]*>/g, '')}</td>
          <td>${this.getResourceLabel(log.resource)}</td>
          <td>${log.ipAddress || '-'}</td>
          <td>${this.formatDetails(log).replace(/<br>/g, '; ').substring(0, 100)}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  },

  async getLogs(filters = {}) {
    try {
      const result = await API.getAuditLogs(filters);

      if (!result) {
        console.error('API returned null/undefined result');
        return [];
      }

      // Fallback if structure changes
      const logs = result.success ? (result.logs || result.data || []) : [];
      return logs;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  },
};
