// ===================================
// AUDIT LOGS MODULE
// ===================================

const AuditLogs = {
  // Store current logs for export
  currentLogs: [],

  // Get audit logs with filters
  async getLogs(filters = {}) {
    try {
      const result = await API.getAuditLogs(filters);
      return result.success ? result.logs : [];
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  },

  // Get action label
  getActionLabel(action) {
    const labels = {
      'VIEW': '👁️ Ver',
      'CREATE': '➕ Crear',
      'UPDATE': '✏️ Editar',
      'DELETE': '🗑️ Eliminar',
      'LOGIN': '🔐 Inicio de sesión',
      'LOGOUT': '🚪 Cierre de sesión'
    };
    return labels[action] || action;
  },

  // Get resource label
  getResourceLabel(resource) {
    const labels = {
      'aircraft': '✈️ Aeronave',
      'pilot': '👨‍✈️ Piloto',
      'user': '👤 Usuario',
      'auth': '🔐 Autenticación'
    };
    return labels[resource] || resource;
  },

  // Format date
  formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },

  // Format details for display
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
        return `<strong>${key}:</strong> ${before} → ${after}`;
      }).join('<br>');
      return changeList || 'Sin cambios';
    } else if (log.action === 'CREATE' && log.details.data) {
      return 'Registro creado';
    } else if (log.action === 'DELETE' && log.details.deletedData) {
      return 'Registro eliminado';
    }

    return '-';
  },

  // Render audit logs list
  renderList() {
    let html = `
      <div class="audit-filters">
        <div class="form-row">
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
          <div class="form-group">
            <label class="form-label">Recurso</label>
            <select class="form-select" id="filterResource">
              <option value="">Todos</option>
              <option value="aircraft">Aeronaves</option>
              <option value="pilot">Pilotos</option>
              <option value="user">Usuarios</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary" onclick="AuditLogs.applyFilters()">🔍 Filtrar</button>
          </div>
        </div>
        <div class="form-row" style="margin-top: var(--spacing-md); gap: var(--spacing-sm);">
          <button class="btn btn-secondary" onclick="AuditLogs.exportToTXT()">📄 Exportar TXT</button>
          <button class="btn btn-secondary" onclick="AuditLogs.exportToExcel()">📊 Exportar Excel</button>
          <button class="btn btn-secondary" onclick="AuditLogs.exportToPDF()">📕 Exportar PDF</button>
        </div>
      </div>

      <div class="table-container">
        <table class="table bordered-table">
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
    `;

    // Load data asynchronously
    setTimeout(async () => {
      await this.loadLogs();
    }, 0);

    return html;
  },

  // Apply filters
  async applyFilters() {
    const action = document.getElementById('filterAction').value;
    const resource = document.getElementById('filterResource').value;

    const filters = {};
    if (action) filters.action = action;
    if (resource) filters.resource = resource;

    await this.loadLogs(filters);
  },

  // Load logs
  async loadLogs(filters = {}) {
    filters.limit = 50; // Limit to last 50 logs

    const logs = await this.getLogs(filters);
    this.currentLogs = logs; // Store for export

    const tbody = document.getElementById('auditLogsTableBody');
    if (!tbody) return;

    if (logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No se encontraron registros</td></tr>';
      return;
    }

    tbody.innerHTML = logs.map(log => {
      const resourceIdentifier = log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-');
      const timestamp = log.created_at || log.createdAt;

      return `
        <tr>
          <td>${this.formatDate(timestamp)}</td>
          <td><strong>${log.username}</strong></td>
          <td>${this.getActionLabel(log.action)}</td>
          <td>${this.getResourceLabel(log.resource)}</td>
          <td>${resourceIdentifier}</td>
          <td>${log.ipAddress || '-'}</td>
          <td style="max-width: 300px; font-size: 0.85em; white-space: normal; word-break: break-word;">${this.formatDetails(log)}</td>
        </tr>
      `;
    }).join('');
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
      content += `Acción: ${this.getActionLabel(log.action)}\n`;
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
      csv += `"${this.getActionLabel(log.action)}",`;
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

    const printWindow = window.open('', '_blank');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Registro de Auditoría - VPFS</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; color: #2563eb; }
          .meta { text-align: center; color: #666; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #2563eb; color: white; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .details { max-width: 200px; word-wrap: break-word; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>📋 REGISTRO DE AUDITORÍA - VPFS</h1>
        <div class="meta">
          <p><strong>Fecha de exportación:</strong> ${new Date().toLocaleString('es-VE')}</p>
          <p><strong>Total de registros:</strong> ${this.currentLogs.length}</p>
        </div>
        <table>
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
          <tbody>
    `;

    this.currentLogs.forEach(log => {
      const timestamp = log.created_at || log.createdAt;
      html += `
        <tr>
          <td>${this.formatDate(timestamp)}</td>
          <td>${log.username}</td>
          <td>${this.getActionLabel(log.action)}</td>
          <td>${this.getResourceLabel(log.resource)}</td>
          <td>${log.resourceName || (log.resourceId ? `ID: ${log.resourceId}` : '-')}</td>
          <td>${log.ipAddress || '-'}</td>
          <td class="details">${this.formatDetails(log)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  }
};
