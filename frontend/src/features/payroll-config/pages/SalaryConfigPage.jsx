import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Layers,
  Plus,
  Search,
  CheckCircle2,
  Sliders,
  Calculator,
  Play,
  Settings2,
  Trash2,
  Edit2,
  X,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  ShieldCheck,
  Check,
  AlertTriangle
} from 'lucide-react';
import { api } from '../../../lib/api.js';
import Skeleton from '../../../components/ui/Skeleton.jsx';
import EmptyState from '../../../components/ui/EmptyState.jsx';
import { useToast } from '../../../components/ui/ToastContext.jsx';
import './SalaryConfigPage.scss';

export default function SalaryConfigPage() {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('structures'); // 'structures' | 'rules' | 'simulator'
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state for rules catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Structure Modal State (Create / Edit Structure Metadata)
  const [isStructModalOpen, setIsStructModalOpen] = useState(false);
  const [structModalMode, setStructModalMode] = useState('create'); // 'create' | 'edit'
  const [selectedStructId, setSelectedStructId] = useState(null);
  const [structFormData, setStructFormData] = useState({
    name: '',
    code: '',
    description: '',
    is_default: false,
    is_active: true,
  });

  // Rule Editor Modal State (F-07)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [ruleModalMode, setRuleModalMode] = useState('create'); // 'create' | 'edit'
  const [ruleTargetStructId, setRuleTargetStructId] = useState(null);
  const [editingRuleOriginalCode, setEditingRuleOriginalCode] = useState(null);
  const [ruleFormData, setRuleFormData] = useState({
    name: '',
    code: '',
    category: 'ALLOWANCE',
    sequence: 35,
    computation_type: 'PERCENTAGE',
    percentage: 10,
    fixed_amount: 0,
    base_code: 'WAGE',
    formula: '',
    condition: '',
    appears_on_payslip: true,
  });
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleModalError, setRuleModalError] = useState('');

  // Structure Rules Management Drawer
  const [managingStruct, setManagingStruct] = useState(null);

  // Simulator Calculator state
  const [simStructureId, setSimStructureId] = useState('');
  const [simWage, setSimWage] = useState(100000);
  const [simWorkedDays, setSimWorkedDays] = useState(22);
  const [simTotalDays, setSimTotalDays] = useState(22);

  // Load structures from backend on mount
  const fetchStructures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/salary-structures');
      if (res?.data?.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : res.data.data.items || [];
        setStructures(list);
        if (list.length > 0 && !simStructureId) {
          const def = list.find((s) => s.is_default) || list[0];
          setSimStructureId(def.id);
        }
      }
    } catch (err) {
      toast.error('Failed to load salary structures from server');
    } finally {
      setLoading(false);
    }
  }, [toast, simStructureId]);

  useEffect(() => {
    fetchStructures();
  }, [fetchStructures]);

  // Handle Structure Create / Edit Submit
  const handleSaveStructure = async (e) => {
    e.preventDefault();
    try {
      if (structModalMode === 'create') {
        const payload = {
          name: structFormData.name.trim(),
          code: structFormData.code.toUpperCase().trim(),
          description: structFormData.description.trim() || undefined,
          is_default: Boolean(structFormData.is_default),
          is_active: Boolean(structFormData.is_active),
        };
        const res = await api.post('/salary-structures', payload);
        if (res?.data?.data) {
          toast.success('Salary structure created successfully!');
          await fetchStructures();
        }
      } else {
        const payload = {
          name: structFormData.name.trim(),
          description: structFormData.description.trim() || undefined,
          is_default: Boolean(structFormData.is_default),
          is_active: Boolean(structFormData.is_active),
        };
        await api.patch(`/salary-structures/${selectedStructId}`, payload);
        toast.success('Salary structure updated successfully!');
        await fetchStructures();
      }
      setIsStructModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to save salary structure');
    }
  };

  // Open Edit Structure Modal
  const handleOpenEditStruct = (struct) => {
    setSelectedStructId(struct.id);
    setStructModalMode('edit');
    setStructFormData({
      name: struct.name,
      code: struct.code,
      description: struct.description || '',
      is_default: Boolean(struct.is_default),
      is_active: Boolean(struct.is_active),
    });
    setIsStructModalOpen(true);
  };

  // Open Create Structure Modal
  const handleOpenCreateStruct = () => {
    setStructModalMode('create');
    setSelectedStructId(null);
    setStructFormData({
      name: '',
      code: '',
      description: '',
      is_default: false,
      is_active: true,
    });
    setIsStructModalOpen(true);
  };

  // Handle Delete Structure
  const handleDeleteStructure = async (id) => {
    if (!window.confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      await api.delete(`/salary-structures/${id}`);
      toast.success('Salary structure deleted successfully');
      await fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Could not delete salary structure');
    }
  };

  // Open Rule Modal for adding rule to structure
  const handleOpenAddRule = (structId) => {
    const target = structures.find((s) => s.id === structId) || structures[0];
    const existingRules = target?.rules || [];
    const nextSeq = (existingRules.length + 1) * 10;

    setRuleTargetStructId(structId);
    setRuleModalMode('create');
    setEditingRuleOriginalCode(null);
    setRuleModalError('');
    setRuleFormData({
      name: '',
      code: '',
      category: 'ALLOWANCE',
      sequence: nextSeq,
      computation_type: 'PERCENTAGE',
      percentage: 10,
      fixed_amount: 0,
      base_code: 'WAGE',
      formula: '',
      condition: '',
      appears_on_payslip: true,
    });
    setIsRuleModalOpen(true);
  };

  // Open Rule Modal for editing an existing rule
  const handleOpenEditRule = (structId, rule) => {
    setRuleTargetStructId(structId);
    setRuleModalMode('edit');
    setEditingRuleOriginalCode(rule.code);
    setRuleModalError('');
    setRuleFormData({
      name: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      computation_type: rule.computation_type,
      percentage: rule.percentage !== null && rule.percentage !== undefined ? rule.percentage : 10,
      fixed_amount: rule.fixed_amount || 0,
      base_code: rule.base_code || 'WAGE',
      formula: rule.formula || '',
      condition: rule.condition || '',
      appears_on_payslip: Boolean(rule.appears_on_payslip),
    });
    setIsRuleModalOpen(true);
  };

  // Save Rule via full replacement PUT /salary-structures/:id/rules (F-07)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    setRuleSubmitting(true);
    setRuleModalError('');

    try {
      const targetStruct = structures.find((s) => s.id === ruleTargetStructId);
      if (!targetStruct) throw new Error('Target structure not found');

      const existingRules = [...(targetStruct.rules || [])];

      const formattedNewRule = {
        code: ruleFormData.code.toUpperCase().trim(),
        name: ruleFormData.name.trim(),
        category: ruleFormData.category,
        sequence: Number(ruleFormData.sequence) || 10,
        computation_type: ruleFormData.computation_type,
        fixed_amount: ruleFormData.computation_type === 'FIXED' ? Number(ruleFormData.fixed_amount) || 0 : null,
        percentage: ruleFormData.computation_type === 'PERCENTAGE' ? Number(ruleFormData.percentage) || 0 : null,
        base_code: ruleFormData.computation_type === 'PERCENTAGE' ? ruleFormData.base_code?.toUpperCase()?.trim() || 'WAGE' : null,
        formula: ruleFormData.computation_type === 'FORMULA' ? ruleFormData.formula?.trim() || null : null,
        condition: ruleFormData.condition?.trim() || null,
        appears_on_payslip: Boolean(ruleFormData.appears_on_payslip),
      };

      let updatedRulesList = [];
      if (ruleModalMode === 'create') {
        // Check for duplicate code in same structure
        if (existingRules.some((r) => r.code === formattedNewRule.code)) {
          setRuleModalError(`A rule with code ${formattedNewRule.code} already exists in this structure.`);
          setRuleSubmitting(false);
          return;
        }
        updatedRulesList = [...existingRules, formattedNewRule];
      } else {
        // Edit mode - replace matching rule
        updatedRulesList = existingRules.map((r) =>
          r.code === editingRuleOriginalCode ? formattedNewRule : r
        );
      }

      // Sort by sequence ASC
      updatedRulesList.sort((a, b) => a.sequence - b.sequence);

      // Submit full replacement array to backend
      const res = await api.put(`/salary-structures/${ruleTargetStructId}/rules`, updatedRulesList);
      if (res?.data?.data) {
        toast.success(`Salary rules updated successfully for ${targetStruct.name}!`);
        await fetchStructures();
        setIsRuleModalOpen(false);
        if (managingStruct && managingStruct.id === ruleTargetStructId) {
          setManagingStruct((prev) => ({ ...prev, rules: res.data.data }));
        }
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Failed to save rule. Please verify formula syntax and sequence dependencies.';
      setRuleModalError(msg);
      toast.error(msg);
    } finally {
      setRuleSubmitting(false);
    }
  };

  // Delete Rule from structure
  const handleDeleteRule = async (structId, ruleCode) => {
    if (!window.confirm(`Are you sure you want to remove rule "${ruleCode}" from this structure?`)) return;

    try {
      const targetStruct = structures.find((s) => s.id === structId);
      if (!targetStruct) return;

      const filtered = (targetStruct.rules || []).filter((r) => r.code !== ruleCode);
      const res = await api.put(`/salary-structures/${structId}/rules`, filtered);
      if (res?.data?.data) {
        toast.success(`Rule "${ruleCode}" removed from ${targetStruct.name}`);
        await fetchStructures();
        if (managingStruct && managingStruct.id === structId) {
          setManagingStruct((prev) => ({ ...prev, rules: res.data.data }));
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove rule');
    }
  };

  // Collect all unique rules for Rules Catalog
  const allRulesMap = new Map();
  structures.forEach((s) => {
    (s.rules || []).forEach((r) => {
      if (!allRulesMap.has(r.code)) {
        allRulesMap.set(r.code, { ...r, structureName: s.name, structureId: s.id });
      }
    });
  });
  const allRulesList = Array.from(allRulesMap.values()).sort((a, b) => a.sequence - b.sequence);

  const filteredRules = allRulesList.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'ALL' || r.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  // Simulator calculations
  const activeSimStructure = structures.find((s) => s.id === simStructureId) || structures[0];
  const simRules = (activeSimStructure?.rules || []).slice().sort((a, b) => a.sequence - b.sequence);

  const simComputedLines = [];
  const simContext = { WAGE: Number(simWage) || 0 };
  let simGross = 0;
  let simDeductions = 0;

  simRules.forEach((rule) => {
    let amount = 0;
    if (rule.computation_type === 'FIXED') {
      amount = Number(rule.fixed_amount) || 0;
    } else if (rule.computation_type === 'PERCENTAGE') {
      const baseVal = simContext[rule.base_code] || simContext.WAGE || 0;
      amount = (baseVal * (Number(rule.percentage) || 0)) / 100;
    } else if (rule.computation_type === 'FORMULA') {
      if (rule.formula) {
        try {
          // Simple safe evaluation of tokens in context
          const expr = rule.formula.replace(/[A-Z0-9_]+/g, (match) => {
            return simContext[match] !== undefined ? simContext[match] : 0;
          });
          // eslint-disable-next-line no-eval
          amount = Function(`'use strict'; return (${expr})`)();
        } catch {
          amount = 0;
        }
      } else if (rule.code === 'GROSS') {
        amount = (simContext.BASIC || 0) + (simContext.HRA || 0) + (simContext.SPECIAL || 0) + (simContext.CONVEYANCE || 0);
      } else if (rule.code === 'NET') {
        amount = simGross - simDeductions;
      }
    }

    if (rule.category === 'BASIC' || rule.category === 'ALLOWANCE') {
      const factor = simTotalDays > 0 ? simWorkedDays / simTotalDays : 1;
      amount = Math.round(amount * factor);
    }

    simContext[rule.code] = Math.round(amount || 0);

    if (rule.category === 'BASIC' || rule.category === 'ALLOWANCE' || rule.category === 'GROSS') {
      if (rule.category !== 'GROSS') simGross += amount;
    } else if (rule.category === 'DEDUCTION') {
      simDeductions += amount;
    }

    simComputedLines.push({
      ...rule,
      calculatedAmount: Math.round(amount || 0),
    });
  });

  const simNet = Math.max(0, Math.round(simGross - simDeductions));

  return (
    <div className="salary-config-page">
      {/* Page Header */}
      <div className="sc-header">
        <div className="sc-header__left">
          <h1 className="sc-header__title">Salary Structures &amp; Rules</h1>
          <p className="sc-header__subtitle">
            Configure salary structures, allowances, statutory deductions, and automated payroll calculation formulas.
          </p>
        </div>

        <div className="sc-header__actions">
          <button className="sc-header__btn-secondary" onClick={() => setActiveTab('simulator')}>
            <Calculator size={16} />
            <span>Formula Simulator</span>
          </button>
          <button className="sc-header__btn-primary" onClick={handleOpenCreateStruct}>
            <Plus size={16} />
            <span>New Structure</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="sc-tabs">
        <button
          className={`sc-tabs__item ${activeTab === 'structures' ? 'sc-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('structures')}
        >
          <Layers size={16} />
          <span>Structures</span>
          <span className="sc-tabs__count">{structures.length}</span>
        </button>

        <button
          className={`sc-tabs__item ${activeTab === 'rules' ? 'sc-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <Sliders size={16} />
          <span>Salary Rules Catalog</span>
          <span className="sc-tabs__count">{allRulesList.length}</span>
        </button>

        <button
          className={`sc-tabs__item ${activeTab === 'simulator' ? 'sc-tabs__item--active' : ''}`}
          onClick={() => setActiveTab('simulator')}
        >
          <Calculator size={16} />
          <span>Formula Simulator</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', padding: '1rem 0' }}>
          {[1, 2].map((n) => (
            <div key={n} style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <Skeleton height="28px" width="60%" style={{ marginBottom: '1rem' }} />
              <Skeleton height="60px" style={{ marginBottom: '1.5rem' }} />
              <Skeleton height="120px" />
            </div>
          ))}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 1: STRUCTURES GRID VIEW                */}
      {/* ========================================== */}
      {!loading && activeTab === 'structures' && (
        <div className="sc-structures-grid">
          {structures.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No Salary Structures Configured"
              description="Create a new salary structure to define payroll rules and computation formulas."
              action={{ label: 'Create Structure', onClick: handleOpenCreateStruct }}
            />
          ) : (
            structures.map((struct) => {
              const rules = struct.rules || [];

              return (
                <div key={struct.id} className="sc-struct-card">
                  {/* Header */}
                  <div className="sc-struct-card__header">
                    <div className="sc-struct-card__brand">
                      <div className="sc-struct-card__icon">
                        <FileSpreadsheet size={22} />
                      </div>
                      <div className="sc-struct-card__title-wrap">
                        <h3 className="sc-struct-card__title">{struct.name}</h3>
                        <div className="sc-struct-card__badges">
                          <span className="sc-struct-card__code-pill">{struct.code}</span>
                          {struct.is_default && (
                            <span className="sc-struct-card__default-pill">DEFAULT</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        className="sc-struct-card__btn-action-icon"
                        onClick={() => handleOpenEditStruct(struct)}
                        title="Edit Structure"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className="sc-struct-card__btn-action-icon"
                        onClick={() => handleDeleteStructure(struct.id)}
                        title="Delete Structure"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="sc-struct-card__desc">
                    {struct.description || 'Configured salary calculation breakdown model.'}
                  </p>

                  {/* Key Metrics */}
                  <div className="sc-struct-card__stats-row">
                    <div className="sc-struct-card__stat-box">
                      <span className="sc-struct-card__stat-box-label">RULES</span>
                      <span className="sc-struct-card__stat-box-value">
                        {rules.length} Rules
                      </span>
                    </div>
                    <div className="sc-struct-card__stat-box">
                      <span className="sc-struct-card__stat-box-label">ASSIGNED EMPLOYEES</span>
                      <span className="sc-struct-card__stat-box-value">
                        {struct.employee_count !== undefined ? struct.employee_count : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Rules Execution Sequence Preview */}
                  <div className="sc-struct-card__rules-preview">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span className="sc-struct-card__rules-heading">Execution Sequence</span>
                      <button
                        onClick={() => handleOpenAddRule(struct.id)}
                        style={{ background: 'none', border: 'none', color: '#2357fe', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                      >
                        <Plus size={13} /> Add Rule
                      </button>
                    </div>

                    {rules.length === 0 ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: 0 }}>No rules added yet.</p>
                    ) : (
                      rules.slice(0, 6).map((r) => (
                        <div key={r.id || r.code} className="sc-struct-card__rule-item">
                          <span className="sc-struct-card__rule-item-seq">{r.sequence}</span>
                          <span className="sc-struct-card__rule-item-name">{r.name}</span>
                          <span className="sc-struct-card__rule-item-expr">
                            {r.formula || (r.percentage ? `${r.percentage}% × ${r.base_code || 'WAGE'}` : `₹${r.fixed_amount || 0}`)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="sc-struct-card__footer">
                    <button
                      className="sc-struct-card__btn-manage"
                      onClick={() => {
                        setSimStructureId(struct.id);
                        setActiveTab('simulator');
                      }}
                    >
                      <Play size={14} />
                      <span>Test in Simulator</span>
                    </button>
                    <button
                      className="sc-struct-card__btn-manage"
                      onClick={() => setManagingStruct(struct)}
                      style={{ background: '#f1f5f9', color: '#1e293b' }}
                    >
                      <Settings2 size={14} />
                      <span>Manage All Rules ({rules.length})</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 2: SALARY RULES CATALOG TABLE          */}
      {/* ========================================== */}
      {!loading && activeTab === 'rules' && (
        <div className="sc-table-card">
          {/* Toolbar */}
          <div className="sc-table-card__toolbar">
            <div className="sc-table-card__search-box">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rules by name or code..."
              />
            </div>

            <div className="sc-table-card__category-filters">
              {['ALL', 'BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET'].map((cat) => (
                <button
                  key={cat}
                  className={`sc-table-card__filter-pill ${categoryFilter === cat ? 'sc-table-card__filter-pill--active' : ''}`}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === 'ALL' ? 'All Categories' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Rule Name</th>
                  <th>Code</th>
                  <th>Category</th>
                  <th>Structure</th>
                  <th>Computation Type</th>
                  <th>Calculation / Expression</th>
                  <th>On Payslip</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                      No rules match the current search or category filter.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id || `${rule.structureId}-${rule.code}`}>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}>
                        {rule.sequence}
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>{rule.name}</td>
                      <td>
                        <span className="sc-struct-card__code-pill">{rule.code}</span>
                      </td>
                      <td>
                        <span className={`sc-cat-badge sc-cat-badge--${rule.category.toLowerCase()}`}>
                          {rule.category}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {rule.structureName}
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                        {rule.computation_type}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.825rem', color: '#334155' }}>
                        {rule.formula || (rule.percentage ? `${rule.percentage}% × ${rule.base_code || 'WAGE'}` : `₹${rule.fixed_amount || 0}`)}
                      </td>
                      <td>
                        {rule.appears_on_payslip ? (
                          <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <Check size={14} /> Yes
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenEditRule(rule.structureId, rule)}
                          title="Edit Rule"
                          style={{ background: 'none', border: 'none', color: '#2357fe', cursor: 'pointer', padding: '4px' }}
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: FORMULA SIMULATOR & CALCULATOR      */}
      {/* ========================================== */}
      {!loading && activeTab === 'simulator' && (
        <div className="sc-simulator">
          {/* Left Inputs Panel */}
          <div className="sc-simulator__inputs-panel">
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Simulator Parameters</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              Test rule execution order and formula calculations with custom wage values.
            </p>

            <div className="sc-simulator__field">
              <label>Target Salary Structure</label>
              <select
                value={simStructureId}
                onChange={(e) => setSimStructureId(e.target.value)}
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="sc-simulator__field">
              <label>Monthly Base Wage (INR)</label>
              <input
                type="number"
                value={simWage}
                step="1000"
                onChange={(e) => setSimWage(Number(e.target.value))}
              />
            </div>

            <div className="sc-simulator__row">
              <div className="sc-simulator__field">
                <label>Worked Days</label>
                <input
                  type="number"
                  value={simWorkedDays}
                  max={simTotalDays}
                  onChange={(e) => setSimWorkedDays(Number(e.target.value))}
                />
              </div>

              <div className="sc-simulator__field">
                <label>Total Period Days</label>
                <input
                  type="number"
                  value={simTotalDays}
                  onChange={(e) => setSimTotalDays(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Right Computed Output Panel */}
          <div className="sc-simulator__output-panel">
            <div className="sc-simulator__output-header">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
                  Calculated Simulation Breakdown
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Structure: {activeSimStructure?.name || 'Standard CTC'}
                </span>
              </div>
            </div>

            {/* 3 Summary Cards */}
            <div className="sc-simulator__calc-summary">
              <div className="sc-simulator__calc-summary-item">
                <span className="sc-simulator__calc-summary-label">GROSS SALARY</span>
                <span className="sc-simulator__calc-summary-val sc-simulator__calc-summary-val--gross">
                  ₹{simGross.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="sc-simulator__calc-summary-item">
                <span className="sc-simulator__calc-summary-label">DEDUCTIONS</span>
                <span className="sc-simulator__calc-summary-val sc-simulator__calc-summary-val--ded">
                  -₹{simDeductions.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="sc-simulator__calc-summary-item">
                <span className="sc-simulator__calc-summary-label">NET TAKE-HOME</span>
                <span className="sc-simulator__calc-summary-val sc-simulator__calc-summary-val--net">
                  ₹{simNet.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Computed Lines Table */}
            <div style={{ overflowX: 'auto', border: '1px solid #f1f5f9', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <tr>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Seq</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Rule</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b' }}>Calculation Method</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>Calculated Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {simComputedLines.map((line) => (
                    <tr key={line.id || line.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', color: '#94a3b8' }}>{line.sequence}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#0f172a' }}>{line.name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span className={`sc-cat-badge sc-cat-badge--${line.category.toLowerCase()}`}>
                          {line.category}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#64748b' }}>
                        {line.formula || (line.percentage ? `${line.percentage}% × ${line.base_code || 'WAGE'}` : `₹${line.fixed_amount || 0}`)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: line.category === 'DEDUCTION' ? '#dc2626' : '#0f172a' }}>
                        {line.category === 'DEDUCTION' ? `-₹${line.calculatedAmount.toLocaleString('en-IN')}` : `₹${line.calculatedAmount.toLocaleString('en-IN')}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* DRAWER: MANAGE ALL RULES FOR A STRUCTURE   */}
      {/* ========================================== */}
      {managingStruct && (
        <div className="sc-modal-backdrop" onClick={() => setManagingStruct(null)}>
          <div
            className="sc-modal"
            style={{ maxWidth: '800px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sc-modal__header">
              <div>
                <h2 className="sc-modal__header-title">Rules for {managingStruct.name}</h2>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Structure Code: {managingStruct.code} · {(managingStruct.rules || []).length} Rules Configured
                </span>
              </div>
              <button className="sc-modal__header-close" onClick={() => setManagingStruct(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="sc-modal__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>
                  Execution Order (Ascending Sequence)
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenAddRule(managingStruct.id)}
                  style={{
                    background: '#2357fe',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} /> Add Rule
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Seq</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Code</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Rule Name</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Category</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b' }}>Calculation</th>
                      <th style={{ padding: '0.6rem 0.75rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(managingStruct.rules || []).map((rule) => (
                      <tr key={rule.id || rule.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}>
                          {rule.sequence}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#1e293b' }}>
                          {rule.code}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>
                          {rule.name}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem' }}>
                          <span className={`sc-cat-badge sc-cat-badge--${rule.category.toLowerCase()}`}>
                            {rule.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>
                          {rule.formula || (rule.percentage ? `${rule.percentage}% × ${rule.base_code || 'WAGE'}` : `₹${rule.fixed_amount || 0}`)}
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenEditRule(managingStruct.id, rule)}
                            title="Edit Rule"
                            style={{ background: 'none', border: 'none', color: '#2357fe', cursor: 'pointer', padding: '4px' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(managingStruct.id, rule.code)}
                            title="Delete Rule"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', marginLeft: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sc-modal__footer">
              <button
                type="button"
                className="sc-modal__footer-save"
                onClick={() => setManagingStruct(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CREATE / EDIT SALARY RULE (F-07)    */}
      {/* ========================================== */}
      {isRuleModalOpen && (
        <div className="sc-modal-backdrop" onClick={() => setIsRuleModalOpen(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal__header">
              <h2 className="sc-modal__header-title">
                {ruleModalMode === 'create' ? 'Add Salary Rule' : `Edit Rule: ${editingRuleOriginalCode}`}
              </h2>
              <button
                className="sc-modal__header-close"
                onClick={() => setIsRuleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule}>
              <div className="sc-modal__body">
                {ruleModalError && (
                  <div
                    style={{
                      padding: '10px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      color: '#dc2626',
                      fontSize: '13px',
                      marginBottom: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{ruleModalError}</span>
                  </div>
                )}

                <div className="sc-modal__row">
                  <div className="sc-modal__form-group">
                    <label>Rule Code *</label>
                    <input
                      type="text"
                      required
                      value={ruleFormData.code}
                      onChange={(e) =>
                        setRuleFormData({ ...ruleFormData, code: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. HRA, BASIC, PF_EMP"
                    />
                  </div>

                  <div className="sc-modal__form-group">
                    <label>Sequence (Execution Order) *</label>
                    <input
                      type="number"
                      required
                      value={ruleFormData.sequence}
                      onChange={(e) =>
                        setRuleFormData({ ...ruleFormData, sequence: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>

                <div className="sc-modal__form-group">
                  <label>Rule Display Name *</label>
                  <input
                    type="text"
                    required
                    value={ruleFormData.name}
                    onChange={(e) => setRuleFormData({ ...ruleFormData, name: e.target.value })}
                    placeholder="e.g. House Rent Allowance"
                  />
                </div>

                <div className="sc-modal__row">
                  <div className="sc-modal__form-group">
                    <label>Category *</label>
                    <select
                      value={ruleFormData.category}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, category: e.target.value })}
                    >
                      <option value="BASIC">BASIC</option>
                      <option value="ALLOWANCE">ALLOWANCE</option>
                      <option value="GROSS">GROSS</option>
                      <option value="DEDUCTION">DEDUCTION</option>
                      <option value="EMPLOYER_CONTRIB">EMPLOYER_CONTRIB</option>
                      <option value="NET">NET</option>
                    </select>
                  </div>

                  <div className="sc-modal__form-group">
                    <label>Computation Type *</label>
                    <select
                      value={ruleFormData.computation_type}
                      onChange={(e) =>
                        setRuleFormData({ ...ruleFormData, computation_type: e.target.value })
                      }
                    >
                      <option value="FIXED">FIXED AMOUNT</option>
                      <option value="PERCENTAGE">PERCENTAGE (%)</option>
                      <option value="FORMULA">PYTHON/EXPRESSION FORMULA</option>
                    </select>
                  </div>
                </div>

                {ruleFormData.computation_type === 'FIXED' && (
                  <div className="sc-modal__form-group">
                    <label>Fixed Amount (INR) *</label>
                    <input
                      type="number"
                      required
                      value={ruleFormData.fixed_amount}
                      onChange={(e) =>
                        setRuleFormData({ ...ruleFormData, fixed_amount: Number(e.target.value) })
                      }
                    />
                  </div>
                )}

                {ruleFormData.computation_type === 'PERCENTAGE' && (
                  <div className="sc-modal__row">
                    <div className="sc-modal__form-group">
                      <label>Percentage (%) *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={ruleFormData.percentage}
                        onChange={(e) =>
                          setRuleFormData({ ...ruleFormData, percentage: Number(e.target.value) })
                        }
                      />
                    </div>

                    <div className="sc-modal__form-group">
                      <label>Base Rule Code *</label>
                      <input
                        type="text"
                        required
                        value={ruleFormData.base_code}
                        onChange={(e) =>
                          setRuleFormData({ ...ruleFormData, base_code: e.target.value.toUpperCase() })
                        }
                        placeholder="e.g. WAGE, BASIC, GROSS"
                      />
                    </div>
                  </div>
                )}

                {ruleFormData.computation_type === 'FORMULA' && (
                  <div className="sc-modal__form-group">
                    <label>Formula Expression (e.g. BASIC + HRA + SPECIAL) *</label>
                    <input
                      type="text"
                      required
                      value={ruleFormData.formula}
                      onChange={(e) => setRuleFormData({ ...ruleFormData, formula: e.target.value })}
                      placeholder="e.g. BASIC + HRA + SPECIAL - PF_EMP"
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <input
                    type="checkbox"
                    id="appearsOnPayslip"
                    checked={ruleFormData.appears_on_payslip}
                    onChange={(e) =>
                      setRuleFormData({ ...ruleFormData, appears_on_payslip: e.target.checked })
                    }
                    style={{ width: 'auto' }}
                  />
                  <label htmlFor="appearsOnPayslip" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                    Show on Employee Payslip Breakdowns
                  </label>
                </div>
              </div>

              <div className="sc-modal__footer">
                <button
                  type="button"
                  className="sc-modal__footer-cancel"
                  onClick={() => setIsRuleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sc-modal__footer-save"
                  disabled={ruleSubmitting}
                >
                  {ruleSubmitting ? 'Saving Rule...' : 'Save Rule to Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL: CREATE / EDIT STRUCTURE             */}
      {/* ========================================== */}
      {isStructModalOpen && (
        <div className="sc-modal-backdrop" onClick={() => setIsStructModalOpen(false)}>
          <div className="sc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sc-modal__header">
              <h2 className="sc-modal__header-title">
                {structModalMode === 'create' ? 'Create Salary Structure' : 'Edit Salary Structure'}
              </h2>
              <button
                className="sc-modal__header-close"
                onClick={() => setIsStructModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStructure}>
              <div className="sc-modal__body">
                <div className="sc-modal__form-group">
                  <label>Structure Name *</label>
                  <input
                    type="text"
                    required
                    value={structFormData.name}
                    onChange={(e) => setStructFormData({ ...structFormData, name: e.target.value })}
                    placeholder="e.g. Standard India CTC Structure"
                  />
                </div>

                <div className="sc-modal__form-group">
                  <label>Structure Code (Unique Identifier) *</label>
                  <input
                    type="text"
                    required
                    disabled={structModalMode === 'edit'}
                    value={structFormData.code}
                    onChange={(e) =>
                      setStructFormData({ ...structFormData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. STD_IN_CTC"
                  />
                </div>

                <div className="sc-modal__form-group">
                  <label>Description</label>
                  <textarea
                    value={structFormData.description}
                    onChange={(e) => setStructFormData({ ...structFormData, description: e.target.value })}
                    placeholder="Detailed overview of when this salary structure applies..."
                  />
                </div>

                <div className="sc-modal__row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={structFormData.is_default}
                      onChange={(e) => setStructFormData({ ...structFormData, is_default: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="isDefault" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      Set as Default Structure
                    </label>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={structFormData.is_active}
                      onChange={(e) => setStructFormData({ ...structFormData, is_active: e.target.checked })}
                      style={{ width: 'auto' }}
                    />
                    <label htmlFor="isActive" style={{ fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}>
                      Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="sc-modal__footer">
                <button
                  type="button"
                  className="sc-modal__footer-cancel"
                  onClick={() => setIsStructModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sc-modal__footer-save">
                  {structModalMode === 'create' ? 'Create Structure' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
