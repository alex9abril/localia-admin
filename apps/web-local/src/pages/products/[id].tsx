import Head from 'next/head';
import { useRouter } from 'next/router';
import LocalLayout from '@/components/layout/LocalLayout';
import { useState, useEffect } from 'react';
import { useSelectedBusiness } from '@/contexts/SelectedBusinessContext';
import { productsService, Product, ProductCategory, ProductType, CreateProductData, ProductVariantGroup } from '@/lib/products';
import ImageUpload from '@/components/ImageUpload';
import CategorySelector from '@/components/CategorySelector';
import { ProductForm } from './index';

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { selectedBusiness } = useSelectedBusiness();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Array<{ fieldName: string; isVisible: boolean; isRequired: boolean; displayOrder?: number }>>([]);
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

  // Cargar producto cuando cambie el ID de la URL
  useEffect(() => {
    if (router.isReady && id && typeof id === 'string' && selectedBusiness?.business_id) {
      loadProduct(id);
      loadCategories();
    }
  }, [router.isReady, id, selectedBusiness?.business_id]);

  const loadProduct = async (productId: string) => {
    try {
      setLoading(true);
      setError(null);

      const productData = await productsService.getProduct(productId);
      setProduct(productData);

      // Cargar configuración de campos para el tipo de producto
      try {
        const config = await productsService.getFieldConfigByProductType(productData.product_type || 'food');
        setFieldConfig(config);
        setSelectedProductType(productData.product_type || 'food');
      } catch (err: any) {
        console.error('Error obteniendo configuración de campos:', err);
      }

      // Llenar formulario con datos del producto
      setFormData({
        business_id: productData.business_id,
        name: productData.name,
        description: productData.description || '',
        image_url: productData.image_url || '',
        price: productData.price,
        product_type: productData.product_type || 'food',
        category_id: productData.category_id || '',
        is_available: productData.is_available,
        is_featured: productData.is_featured,
        display_order: productData.display_order || 0,
        requires_prescription: productData.requires_prescription,
        age_restriction: productData.age_restriction,
        max_quantity_per_order: productData.max_quantity_per_order,
        requires_pharmacist_validation: productData.requires_pharmacist_validation,
      });
      setImagePreview(productData.image_url || null);
      
      // Asegurarse de que variant_groups sea un array y que cada grupo tenga su array de variants
      let loadedVariantGroups = productData.variant_groups || [];
      if (Array.isArray(loadedVariantGroups)) {
        // Asegurarse de que cada grupo tenga su array de variants
        loadedVariantGroups = loadedVariantGroups.map((group: any) => ({
          ...group,
          variants: Array.isArray(group.variants) ? group.variants : [],
        }));
      } else {
        loadedVariantGroups = [];
      }
      
      console.log('🔍 [FRONTEND] Cargando variant_groups:', JSON.stringify(loadedVariantGroups, null, 2));
      setVariantGroups(loadedVariantGroups);
      setAllergens(productData.allergens || []);
      setNutritionalInfo(productData.nutritional_info || {});
    } catch (err: any) {
      console.error('Error cargando producto:', err);
      setError('Error al cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await productsService.getCategories();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err: any) {
      console.error('Error cargando categorías:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setError(null);
    setSaving(true);

    try {
      let imageUrl = formData.image_url;

      // TODO: Subir imagen si hay un archivo nuevo
      if (imageFile) {
        imageUrl = imagePreview || formData.image_url;
      }

      // Preparar datos para actualización (sin business_id, ya que no debe cambiar)
      const { business_id, ...updateData } = formData;
      
      // Construir objeto sin business_id explícitamente
      // Asegurarse de que variant_groups tenga la estructura correcta con variantes
      console.log('🔍 [FRONTEND] variantGroups antes de enviar:', JSON.stringify(variantGroups, null, 2));
      
      const productData: any = {
        name: updateData.name,
        description: updateData.description,
        image_url: imageUrl,
        price: updateData.price,
        product_type: updateData.product_type,
        category_id: updateData.category_id,
        is_available: updateData.is_available,
        is_featured: updateData.is_featured,
        display_order: updateData.display_order,
        variant_groups: variantGroups, // Enviar siempre, incluso si está vacío para poder eliminar grupos
        allergens: allergens.length > 0 ? allergens : undefined,
        nutritional_info: Object.keys(nutritionalInfo).length > 0 ? nutritionalInfo : undefined,
        requires_prescription: updateData.requires_prescription,
        age_restriction: updateData.age_restriction,
        max_quantity_per_order: updateData.max_quantity_per_order,
        requires_pharmacist_validation: updateData.requires_pharmacist_validation,
      };
      
      console.log('🔍 [FRONTEND] productData.variant_groups:', JSON.stringify(productData.variant_groups, null, 2));

      // Eliminar campos undefined para no enviarlos
      Object.keys(productData).forEach(key => {
        if (productData[key] === undefined) {
          delete productData[key];
        }
      });

      await productsService.updateProduct({ ...productData, id: product.id });
      
      // Recargar producto actualizado
      await loadProduct(product.id);
    } catch (err: any) {
      console.error('Error guardando producto:', err);
      setError(err.message || 'Error al guardar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/products');
  };

  // Obtener categorías filtradas por tipo de producto
  const getFilteredCategories = () => {
    if (!formData.product_type) return categories;
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
          <div className="text-gray-500">Cargando producto...</div>
        </div>
      </LocalLayout>
    );
  }

  if (!product) {
    return (
      <LocalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Producto no encontrado</p>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-normal border border-gray-200 rounded text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Volver a la lista
            </button>
          </div>
        </div>
      </LocalLayout>
    );
  }

  return (
    <LocalLayout>
      <Head>
        <title>Editar Producto - LOCALIA Local</title>
      </Head>

      <div className="w-full h-full flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-lg font-medium text-gray-900">Editar Producto</h1>
          <button
            onClick={handleCancel}
            className="px-3 py-1.5 text-sm font-normal border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors"
          >
            ← Volver a la lista
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

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
          editingProduct={product}
          saving={saving}
          fieldConfig={fieldConfig}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </LocalLayout>
  );
}


