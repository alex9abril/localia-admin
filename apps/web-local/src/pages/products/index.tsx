import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import ImageUpload from '@/components/ImageUpload';
import CategorySelector from '@/components/CategorySelector';

export default function ProductsPage() {
  const router = useRouter();
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showProductTypeSelection, setShowProductTypeSelection] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean }>>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [formData, setFormData] = useState<CreateProductData>({
    business_id: '',
    name: '',
    description: '',
    image_url: '',
    price: 0,
    product_type: 'food',
    category_id: '',
    is_available: true,
    is_featured: false,
    display_order: 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [variantGroups, setVariantGroups] = useState<ProductVariantGroup[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [nutritionalInfo, setNutritionalInfo] = useState<Record<string, any>>({});

  // Cargar datos iniciales
  useEffect(() => {
    if (selectedBusiness?.business_id) {
      loadData();
    }
  }, [selectedBusiness?.business_id]);

  const loadData = async () => {
    if (!selectedBusiness?.business_id) return;

    try {
      setLoading(true);
      setError(null);

      // Cargar productos y categorías en paralelo
      const [productsData, categoriesData] = await Promise.all([
        productsService.getProducts(selectedBusiness.business_id),
        productsService.getCategories(),
      ]);

      // Asegurar que productsData sea un array
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    if (!selectedBusiness?.business_id) {
      setError('No hay negocio seleccionado');
      return;
    }

    resetForm();
    setShowProductTypeSelection(true);
  };

  const handleProductTypeSelect = async (productType: ProductType) => {
    try {
      // Obtener configuración de campos para este tipo
      const config = await productsService.getFieldConfigByProductType(productType);
      setFieldConfig(config);
      setSelectedProductType(productType);
      
      // Inicializar formulario con el tipo seleccionado
      setFormData({
        ...formData,
        business_id: selectedBusiness?.business_id || '',
        product_type: productType,
      });
      
      setShowProductTypeSelection(false);
      setShowForm(true);
    } catch (err: any) {
      console.error('Error obteniendo configuración de campos:', err);
      setError('Error al cargar configuración del formulario');
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    
    // Cargar configuración de campos para el tipo de producto
    try {
      const config = await productsService.getFieldConfigByProductType(product.product_type || 'food');
      setFieldConfig(config);
      setSelectedProductType(product.product_type || 'food');
    } catch (err: any) {
      console.error('Error obteniendo configuración de campos:', err);
    }
    
    setFormData({
      business_id: product.business_id,
      name: product.name,
      description: product.description || '',
      image_url: product.image_url || '',
      price: product.price,
      product_type: product.product_type || 'food',
      category_id: product.category_id || '',
      is_available: product.is_available,
      is_featured: product.is_featured,
      display_order: product.display_order || 0,
      requires_prescription: product.requires_prescription,
      age_restriction: product.age_restriction,
      max_quantity_per_order: product.max_quantity_per_order,
      requires_pharmacist_validation: product.requires_pharmacist_validation,
    });
    setImagePreview(product.image_url || null);
    setVariantGroups(product.variant_groups || []);
    setAllergens(product.allergens || []);
    setNutritionalInfo(product.nutritional_info || {});
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      business_id: selectedBusiness?.business_id || '',
      name: '',
      description: '',
      image_url: '',
      price: 0,
      product_type: 'food',
      category_id: '',
      is_available: true,
      is_featured: false,
      display_order: 0,
    });
    setImageFile(null);
    setImagePreview(null);
    setVariantGroups([]);
    setAllergens([]);
    setNutritionalInfo({});
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      let imageUrl = formData.image_url;

      // TODO: Subir imagen si hay un archivo nuevo
      // Por ahora, si hay un archivo, mostrar un mensaje de que necesita una URL
      if (imageFile) {
        // Por ahora, usamos el preview como URL temporal
        // En producción, esto debería subir la imagen al servidor
        imageUrl = imagePreview || formData.image_url;
        // TODO: Descomentar cuando esté implementado:
        // imageUrl = await productsService.uploadProductImage(imageFile, editingProduct?.id);
      }

      const productData: CreateProductData = {
        ...formData,
        image_url: imageUrl,
        variant_groups: variantGroups.length > 0 ? variantGroups : undefined,
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
      };

      if (editingProduct) {
        await productsService.updateProduct({ ...productData, id: editingProduct.id });
      } else {
        await productsService.createProduct(productData);
      }

      await loadData();
      // Si es un producto nuevo, mantener el formulario abierto para gestionar variantes
      if (!editingProduct) {
        // Recargar el producto recién creado para obtener su ID
        const updatedProducts = await productsService.getProducts(selectedBusiness?.business_id || '');
        const newProduct = updatedProducts.find(p => p.name === formData.name);
        if (newProduct) {
          setEditingProduct(newProduct);
          setFormData({ ...formData, business_id: newProduct.business_id });
        }
      } else {
        // Si es edición, cerrar el formulario
        setShowForm(false);
        resetForm();
      }
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este producto?')) {
      return;
    }

    try {
      await productsService.deleteProduct(productId);
      await loadData();
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      setError('Error al eliminar el producto');
    }
  };

  // Obtener categorías filtradas por tipo de producto
  const getFilteredCategories = () => {
    if (!formData.product_type) return categories;
    // Filtrar categorías que tengan el atributo product_type o que sean generales
    return categories.filter(cat => {
      const attrs = cat.attributes || {};
      return !attrs.product_type || attrs.product_type === formData.product_type;
    });
  };

  // Verificar si el producto es de farmacia
  const isMedicine = formData.product_type === 'medicine';

  if (loading) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Cargando productos...</div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Productos - LOCALIA Local</title>
      </Head>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-medium text-gray-900">Productos</h1>
          {!showForm && (
            <button
              onClick={handleCreate}
              className="px-3 py-1.5 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
            >
              + Nuevo Producto
            </button>
          )}
          {showForm && (
            <button
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="px-3 py-1.5 text-sm font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
            >
              ← Volver a la lista
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {showProductTypeSelection ? (
          /* Selección de tipo de producto */
          <ProductTypeSelection
            onSelect={handleProductTypeSelect}
            onCancel={() => {
              setShowProductTypeSelection(false);
              resetForm();
            }}
          />
        ) : showForm ? (
          /* Formulario integrado */
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            categories={getFilteredCategories()}
            imageFile={imageFile}
            imagePreview={imagePreview}
            onImageChange={(file, preview) => {
              setImageFile(file);
              setImagePreview(preview);
            }}
            variantGroups={variantGroups}
            setVariantGroups={setVariantGroups}
            allergens={allergens}
            setAllergens={setAllergens}
            nutritionalInfo={nutritionalInfo}
            setNutritionalInfo={setNutritionalInfo}
            isMedicine={isMedicine}
            editingProduct={editingProduct}
            saving={saving}
            fieldConfig={fieldConfig}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setShowProductTypeSelection(false);
              setSelectedProductType(null);
              resetForm();
            }}
          />
        ) : (
          /* Lista de productos */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded border border-gray-200 overflow-hidden"
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                    {product.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">${product.price.toFixed(2)}</span>
                      <span className={`px-2 py-0.5 text-xs font-normal rounded ${
                        product.is_available
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}>
                        {product.is_available ? 'Disponible' : 'No disponible'}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="flex-1 px-3 py-1.5 text-xs font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                      >
                        Desactivar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-gray-500">No hay productos registrados</p>
                <button
                  onClick={handleCreate}
                  className="mt-4 px-3 py-1.5 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Crear primer producto
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </LocalLayout>
  );
}

// Componente de selección de tipo de producto
interface ProductTypeSelectionProps {
  onSelect: (productType: ProductType) => void;
  onCancel: () => void;
}

function ProductTypeSelection({ onSelect, onCancel }: ProductTypeSelectionProps) {
  const productTypes = productsService.getProductTypes();

  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">Seleccionar Tipo de Producto</h2>
      </div>

      <div className="p-6">
        <p className="text-sm text-gray-600 mb-6">
          Selecciona el tipo de producto que deseas crear. Esto determinará qué campos estarán disponibles en el formulario.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {productTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => onSelect(type.value)}
              className="p-4 border border-gray-200 rounded hover:border-gray-400 hover:bg-gray-50 transition-colors text-left"
            >
              <h3 className="text-sm font-medium text-gray-900 mb-1">{type.label}</h3>
              <p className="text-xs text-gray-500">
                {type.value === 'food' && 'Alimentos y comidas preparadas'}
                {type.value === 'beverage' && 'Bebidas y refrescos'}
                {type.value === 'medicine' && 'Medicamentos y productos farmacéuticos'}
                {type.value === 'grocery' && 'Abarrotes y productos de despensa'}
                {type.value === 'non_food' && 'Productos no alimenticios'}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente del formulario integrado
interface ProductFormProps {
  formData: CreateProductData;
  setFormData: React.Dispatch<React.SetStateAction<CreateProductData>>;
  categories: ProductCategory[];
  imageFile: File | null;
  imagePreview: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
  variantGroups: ProductVariantGroup[];
  setVariantGroups: React.Dispatch<React.SetStateAction<ProductVariantGroup[]>>;
  allergens: string[];
  setAllergens: React.Dispatch<React.SetStateAction<string[]>>;
  nutritionalInfo: Record<string, any>;
  setNutritionalInfo: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  isMedicine: boolean;
  editingProduct: Product | null;
  saving: boolean;
  fieldConfig: Array<{ fieldName: string; isVisible: boolean; isRequired: boolean }>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function ProductForm({
  formData,
  setFormData,
  categories,
  imageFile,
  imagePreview,
  onImageChange,
  variantGroups,
  setVariantGroups,
  allergens,
  setAllergens,
  nutritionalInfo,
  setNutritionalInfo,
  isMedicine,
  editingProduct,
  saving,
  fieldConfig,
  onSubmit,
  onCancel,
}: ProductFormProps) {
  const productTypes = productsService.getProductTypes();
  const commonAllergens = ['gluten', 'lactosa', 'huevo', 'soja', 'nueces', 'pescado', 'mariscos', 'sésamo'];

  // Helper para verificar si un campo es visible
  const isFieldVisible = (fieldName: string): boolean => {
    const field = fieldConfig.find(f => f.fieldName === fieldName);
    return field ? field.isVisible : true; // Por defecto visible si no hay configuración
  };

  const addVariantGroup = () => {
    setVariantGroups([
      ...variantGroups,
      {
        name: '',
        description: '',
        is_required: false,
        selection_type: 'single',
        display_order: variantGroups.length + 1,
        variants: [],
      },
    ]);
  };

  const removeVariantGroup = (index: number) => {
    setVariantGroups(variantGroups.filter((_, i) => i !== index));
  };

  const updateVariantGroup = (index: number, updates: Partial<ProductVariantGroup>) => {
    const updated = [...variantGroups];
    updated[index] = { ...updated[index], ...updates };
    setVariantGroups(updated);
  };

  const addVariant = (groupIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants.push({
      name: '',
      description: '',
      price_adjustment: 0,
      is_available: true,
      display_order: updated[groupIndex].variants.length + 1,
    });
    setVariantGroups(updated);
  };

  const removeVariant = (groupIndex: number, variantIndex: number) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants = updated[groupIndex].variants.filter((_, i) => i !== variantIndex);
    setVariantGroups(updated);
  };

  const updateVariant = (groupIndex: number, variantIndex: number, updates: any) => {
    const updated = [...variantGroups];
    updated[groupIndex].variants[variantIndex] = {
      ...updated[groupIndex].variants[variantIndex],
      ...updates,
    };
    setVariantGroups(updated);
  };

  const toggleAllergen = (allergen: string) => {
    if (allergens.includes(allergen)) {
      setAllergens(allergens.filter(a => a !== allergen));
    } else {
      setAllergens([...allergens, allergen]);
    }
  };

  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-base font-medium text-gray-900">
          {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        </h2>
      </div>

      <form onSubmit={onSubmit} className="p-6 space-y-8">
          {/* Información Básica */}
          <div className="space-y-5">
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Información Básica</h3>

            <div>
              <label className="block text-xs font-normal text-gray-600 mb-1.5">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={255}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Hamburguesa Clásica"
              />
            </div>

            <div>
              <label className="block text-xs font-normal text-gray-600 mb-1.5">
                Descripción
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe el producto..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Tipo de Producto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  disabled
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded bg-gray-50 text-gray-600"
                  value={productTypes.find(t => t.value === formData.product_type)?.label || formData.product_type}
                />
                <p className="text-xs text-gray-400 mt-1">Gestionado por administradores</p>
              </div>

              <div>
                <CategorySelector
                  categories={categories}
                  value={formData.category_id}
                  onChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
                  required
                  placeholder="Selecciona una categoría"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Precio <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
                <span className="ml-2 text-sm text-gray-600">Disponible</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <span className="ml-2 text-sm text-gray-600">Destacado</span>
              </label>
            </div>
          </div>

          {/* Imagen */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">Imagen del Producto</h3>
            <ImageUpload
              currentImageUrl={imagePreview || undefined}
              onImageChange={onImageChange}
              label="Imagen"
            />
          </div>

          {/* Variantes - Solo si el producto ya está creado */}
          {editingProduct && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide">Variantes del Producto</h3>
                <button
                  type="button"
                  onClick={addVariantGroup}
                  className="px-3 py-1.5 text-xs font-normal text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  + Agregar Grupo de Variantes
                </button>
              </div>

              {variantGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4 p-4 border border-gray-200 rounded">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-sm font-normal text-gray-700">Grupo {groupIndex + 1}</h4>
                    <button
                      type="button"
                      onClick={() => removeVariantGroup(groupIndex)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Eliminar
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Nombre del Grupo</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        value={group.name}
                        onChange={(e) => updateVariantGroup(groupIndex, { name: e.target.value })}
                        placeholder="Ej: Tamaño, Extras, Sabor"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-normal text-gray-600 mb-1.5">Tipo de Selección</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                        value={group.selection_type}
                        onChange={(e) => updateVariantGroup(groupIndex, { selection_type: e.target.value as 'single' | 'multiple' })}
                      >
                        <option value="single">Única</option>
                        <option value="multiple">Múltiple</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={group.is_required}
                      onChange={(e) => updateVariantGroup(groupIndex, { is_required: e.target.checked })}
                    />
                    <span className="ml-2 text-sm text-gray-600">Obligatorio seleccionar</span>
                  </label>

                  <div className="space-y-2">
                    {group.variants.map((variant, variantIndex) => (
                      <div key={variantIndex} className="flex gap-2 items-start p-2 bg-gray-50 rounded">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="text"
                            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            value={variant.name}
                            onChange={(e) => updateVariant(groupIndex, variantIndex, { name: e.target.value })}
                            placeholder="Nombre (ej: Chica)"
                          />
                          <input
                            type="number"
                            step="0.01"
                            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            value={variant.price_adjustment}
                            onChange={(e) => updateVariant(groupIndex, variantIndex, { price_adjustment: parseFloat(e.target.value) || 0 })}
                            placeholder="Ajuste precio"
                          />
                          <input
                            type="number"
                            step="0.01"
                            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                            value={variant.absolute_price || ''}
                            onChange={(e) => updateVariant(groupIndex, variantIndex, { absolute_price: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Precio absoluto (opcional)"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVariant(groupIndex, variantIndex)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addVariant(groupIndex)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      + Agregar Variante
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {!editingProduct && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded">
              <p className="text-sm text-gray-500">
                Las variantes se pueden gestionar después de crear el producto.
              </p>
            </div>
          )}

          {/* Alérgenos - Solo si es visible para este tipo de producto */}
          {isFieldVisible('allergens') && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">Alérgenos</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {commonAllergens.map((allergen) => (
                  <label key={allergen} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                      checked={allergens.includes(allergen)}
                      onChange={() => toggleAllergen(allergen)}
                    />
                    <span className="ml-2 text-sm text-gray-600 capitalize">{allergen}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Información Nutricional - Solo si es visible para este tipo de producto */}
          {isFieldVisible('nutritional_info') && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">Información Nutricional (Opcional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Calorías</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.calories || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, calories: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="kcal"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Proteína (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.protein || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, protein: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Carbohidratos (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.carbohydrates || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, carbohydrates: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
              <div>
                <label className="block text-xs font-normal text-gray-600 mb-1.5">Grasas (g)</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                  value={nutritionalInfo.fats || ''}
                  onChange={(e) => setNutritionalInfo({ ...nutritionalInfo, fats: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="g"
                />
              </div>
            </div>
          </div>
          )}

          {/* Campos de Farmacia - Solo si es visible para este tipo de producto */}
          {isFieldVisible('requires_prescription') && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-4">Información de Farmacia</h3>
              <div className="space-y-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                    checked={formData.requires_prescription || false}
                    onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-600">Requiere receta médica</span>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">Restricción de Edad</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={formData.age_restriction || ''}
                      onChange={(e) => setFormData({ ...formData, age_restriction: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Edad mínima (años)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-normal text-gray-600 mb-1.5">Cantidad Máxima por Pedido</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
                      value={formData.max_quantity_per_order || ''}
                      onChange={(e) => setFormData({ ...formData, max_quantity_per_order: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Cantidad máxima"
                    />
                  </div>
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-400"
                    checked={formData.requires_pharmacist_validation || false}
                    onChange={(e) => setFormData({ ...formData, requires_pharmacist_validation: e.target.checked })}
                  />
                  <span className="ml-2 text-sm text-gray-600">Requiere validación de farmacéutico</span>
                </label>
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-normal bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
    </div>
  );
}

