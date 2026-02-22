import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Upload, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";

export default function CleanerSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Account details
    full_name: "",
    email: "",
    
    // Cleaner profile
    business_name: "",
    bio: "",
    profile_photo: "",
    
    // Service area
    city: "",
    postcode_prefix: "",
    radius_miles: 10,
    
    // Pricing
    base_price: "",
    price_per_bedroom: "",
    price_per_bathroom: "",
    minimum_charge: "",
    
    // Subscription
    subscription_plan: "basic"
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange('profile_photo', file_url);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if user is authenticated
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        // Redirect to login/signup
        toast.info('Please create an account first');
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      // Get current user
      const user = await base44.auth.me();

      // Create cleaner profile
      await base44.entities.Cleaner.create({
        user_id: user.id,
        business_name: formData.business_name,
        bio: formData.bio,
        profile_photo: formData.profile_photo,
        service_area: {
          city: formData.city,
          postcode_prefix: formData.postcode_prefix,
          radius_miles: parseInt(formData.radius_miles)
        },
        base_price: parseFloat(formData.base_price),
        price_per_bedroom: parseFloat(formData.price_per_bedroom) || 0,
        price_per_bathroom: parseFloat(formData.price_per_bathroom) || 0,
        minimum_charge: parseFloat(formData.minimum_charge),
        subscription_plan: formData.subscription_plan,
        subscription_status: "trial",
        subscription_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });

      toast.success('Welcome to CleanKeep! Your 30-day trial has started.');
      navigate(createPageUrl('CleanerDashboard'));
    } catch (error) {
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Join CleanKeep</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Start Your Cleaner Profile
          </h1>
          <p className="text-gray-600">30-day free trial • Card required</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create Your Profile</CardTitle>
            <CardDescription>
              Tell hosts about your cleaning business and service area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Business Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Business Information</h3>
                
                <div>
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    placeholder="e.g., Sparkling Stays Cleaning"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="bio">About Your Service *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Describe your experience, approach, and what makes you reliable..."
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label>Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    {formData.profile_photo && (
                      <img 
                        src={formData.profile_photo} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Photo</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Service Area */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Service Area
                </h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City/Town *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      placeholder="e.g., Brighton"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="postcode_prefix">Postcode Prefix *</Label>
                    <Input
                      id="postcode_prefix"
                      value={formData.postcode_prefix}
                      onChange={(e) => handleChange('postcode_prefix', e.target.value)}
                      placeholder="e.g., BN1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="radius">Service Radius (miles)</Label>
                  <Select 
                    value={formData.radius_miles.toString()}
                    onValueChange={(val) => handleChange('radius_miles', parseInt(val))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 miles</SelectItem>
                      <SelectItem value="10">10 miles</SelectItem>
                      <SelectItem value="15">15 miles</SelectItem>
                      <SelectItem value="20">20 miles</SelectItem>
                      <SelectItem value="30">30 miles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-lg">Your Pricing</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_price">Base Price (£) *</Label>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => handleChange('base_price', e.target.value)}
                      placeholder="e.g., 50"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="minimum_charge">Minimum Charge (£) *</Label>
                    <Input
                      id="minimum_charge"
                      type="number"
                      step="0.01"
                      value={formData.minimum_charge}
                      onChange={(e) => handleChange('minimum_charge', e.target.value)}
                      placeholder="e.g., 40"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_per_bedroom">Per Bedroom (£)</Label>
                    <Input
                      id="price_per_bedroom"
                      type="number"
                      step="0.01"
                      value={formData.price_per_bedroom}
                      onChange={(e) => handleChange('price_per_bedroom', e.target.value)}
                      placeholder="e.g., 10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="price_per_bathroom">Per Bathroom (£)</Label>
                    <Input
                      id="price_per_bathroom"
                      type="number"
                      step="0.01"
                      value={formData.price_per_bathroom}
                      onChange={(e) => handleChange('price_per_bathroom', e.target.value)}
                      placeholder="e.g., 15"
                    />
                  </div>
                </div>
              </div>

              {/* Subscription Choice */}
              <div className="space-y-4 pt-6 border-t">
                <h3 className="font-semibold text-lg">Choose Your Plan</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <label className={`cursor-pointer border-2 rounded-lg p-4 ${formData.subscription_plan === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="plan"
                      value="basic"
                      checked={formData.subscription_plan === 'basic'}
                      onChange={(e) => handleChange('subscription_plan', e.target.value)}
                      className="mb-2"
                    />
                    <div className="font-semibold">Basic - £5/month</div>
                    <div className="text-sm text-gray-600">All essential features</div>
                  </label>

                  <label className={`cursor-pointer border-2 rounded-lg p-4 ${formData.subscription_plan === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                    <input
                      type="radio"
                      name="plan"
                      value="pro"
                      checked={formData.subscription_plan === 'pro'}
                      onChange={(e) => handleChange('subscription_plan', e.target.value)}
                      className="mb-2"
                    />
                    <div className="font-semibold">Pro - £10/month</div>
                    <div className="text-sm text-gray-600">Priority + verified badge</div>
                  </label>
                </div>

                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                  ✨ Start with a 30-day free trial. After your trial ends, you'll be automatically enrolled in the plan you selected.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Creating Profile...' : 'Start Free Trial'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}