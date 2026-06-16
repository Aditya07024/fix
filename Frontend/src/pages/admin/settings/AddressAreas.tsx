import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card, CardBody } from "@/components/Card";
import { Input, Select } from "@/components/Form";
import { Modal } from "@/components/Modal";
import { Table } from "@/components/DataDisplay";
import { adminAPI } from "@/services/api";

interface AddressArea {
  id: string;
  name: string;
  line2?: string;
  city: string;
  state: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const AddressAreasTab: React.FC = () => {
  const [areas, setAreas] = useState<AddressArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterActive, setFilterActive] = useState("all");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedArea, setSelectedArea] = useState<AddressArea | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    line2: "",
    city: "",
    state: "",
    description: "",
  });

  const loadAreas = async () => {
    setLoading(true);
    setError(null);

    try {
      const isActive =
        filterActive === "all" ? undefined : filterActive === "active";
      const response = await adminAPI.getAddressAreas(isActive);
      setAreas(response.data || []);
    } catch (err: any) {
      setError(err?.error || err?.message || "Failed to load address areas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, [filterActive]);

  const handleOpenForm = (area: AddressArea | null = null) => {
    if (area) {
      setSelectedArea(area);
      setFormData({
        name: area.name || "",
        line2: area.line2 || "",
        city: area.city || "",
        state: area.state || "",
        description: area.description || "",
      });
      setIsEditing(true);
    } else {
      setFormData({
        name: "",
        line2: "",
        city: "",
        state: "",
        description: "",
      });
      setIsEditing(false);
    }
    setIsFormOpen(true);
    setError(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedArea(null);
    setFormData({ name: "", line2: "", city: "", state: "", description: "" });
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validate
    if (!formData.name.trim()) {
      setError("Area name is required");
      return;
    }
    if (!formData.city.trim()) {
      setError("City is required");
      return;
    }
    if (!formData.state.trim()) {
      setError("State is required");
      return;
    }

    try {
      setIsSubmitting(true);

      if (isEditing && selectedArea) {
        // Update
        await adminAPI.updateAddressArea(selectedArea.id, {
          name: formData.name.trim(),
          line2: formData.line2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          description: formData.description.trim() || undefined,
        });
      } else {
        // Create
        await adminAPI.createAddressArea({
          name: formData.name.trim(),
          line2: formData.line2.trim() || undefined,
          city: formData.city.trim(),
          state: formData.state.trim(),
          description: formData.description.trim() || undefined,
        });
      }

      handleCloseForm();
      await loadAreas();
    } catch (err: any) {
      setError(err?.error || err?.message || "Failed to save address area");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this address area?")) {
      return;
    }

    try {
      await adminAPI.deleteAddressArea(id);
      setAreas((current) => current.filter((area) => area.id !== id));
    } catch (err: any) {
      setError(err?.error || err?.message || "Failed to delete address area");
    }
  };

  return (
    <div className="space-y-lg">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg mb-sm">Address Areas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage colonies and address areas available for bookings.
          </p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => handleOpenForm()}
          size="sm"
        >
          Add Area
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <Card>
        <CardBody>
          <div className="mb-lg">
            <Select
              options={[
                { value: "all", label: "All Status" },
                { value: "active", label: "Active Only" },
                { value: "inactive", label: "Inactive Only" },
              ]}
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            />
          </div>

          <Table
            loading={loading}
            emptyState="No address areas found"
            columns={[
              { key: "name", label: "Area Name" },
              {
                key: "line2",
                label: "Address Line 2",
                render: (value: string) => value || "-",
              },
              { key: "city", label: "City" },
              { key: "state", label: "State" },
              {
                key: "is_active",
                label: "Status",
                render: (value: boolean) => (
                  <Badge variant={value ? "success" : "danger"}>
                    {value ? "Active" : "Inactive"}
                  </Badge>
                ),
              },
              {
                key: "description",
                label: "Description",
                render: (value: string) => (
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {value || "-"}
                  </span>
                ),
              },
              {
                key: "id",
                label: "Actions",
                render: (_: string, row: AddressArea) => (
                  <div className="flex gap-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Edit2 size={16} />}
                      onClick={() => handleOpenForm(row)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDelete(row.id)}
                    />
                  </div>
                ),
              },
            ]}
            data={areas}
          />
        </CardBody>
      </Card>

      <Modal
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        title={isEditing ? "Edit Address Area" : "Add New Address Area"}
      >
        <div className="space-y-lg">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}
          <Input
            label="Area Name *"
            placeholder="e.g., Vasundhara, Sector 1"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isSubmitting}
          />
          <Input
            label="Address Line 2 (Optional)"
            placeholder="e.g., Near Metro Station"
            value={formData.line2}
            onChange={(e) =>
              setFormData({ ...formData, line2: e.target.value })
            }
            disabled={isSubmitting}
          />
          <div className="grid md:grid-cols-2 gap-lg">
            <Input
              label="City *"
              placeholder="e.g., Ghaziabad"
              value={formData.city}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
              disabled={isSubmitting}
            />
            <Input
              label="State *"
              placeholder="e.g., Uttar Pradesh"
              value={formData.state}
              onChange={(e) =>
                setFormData({ ...formData, state: e.target.value })
              }
              disabled={isSubmitting}
            />
          </div>
          <Input
            label="Description (Optional)"
            placeholder="Add any additional information"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            disabled={isSubmitting}
          />
          <div className="flex gap-md pt-lg">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleCloseForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddressAreasTab;
