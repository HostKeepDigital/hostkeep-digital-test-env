import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { 
  Star, Upload, MapPin, DollarSign, Calendar, 
  TrendingUp, Award, Shield, CheckCircle, Sparkles,
  Clock, AlertCircle, Target, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { addUserRole, getUserRoles, hasRole } from "@/components/utils/roleHelpers";

export default function CleanerSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    // Profile
    display_name: "",
    service_area_city: "",
    service_area_postcode: "",
    experience_level: "intermediate",
    bio: "",
    profile_photo: "",
    work_photos: [],
    certifications: "",
    holiday_let_experience: "",
    
    // Pricing
    base_price: "",
    minimum_charge: "",
    optional_services: {
      laundry: false,
      linen_changes: false,
      deep_cleaning: false
    },
    
    // Availability Mode
    availability_mode: "flexible", // active, flexible, unavailable
    preferred_days: [],
    time_windows: [],
    
    // Automation
    auto_accept_enabled: false,
    auto_accept_price_range: { min: 0, max: 0 },
    auto_accept_radius: false,
    max_jobs_per_day: 3,
    travel_radius: 10,
    
    // Subscription
    subscription_plan: "basic"
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNestedChange = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const handlePhotoUpload = async (e, type = 'profile') => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === 'profile') {
        handleChange('profile_photo', file_url);
      } else {
        handleChange('work_photos', [...formData.work_photos, file_url]);
      }
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
    }
  };

  const toggleDay = (day) => {
    const days = formData.preferred_days.includes(day)
      ? formData.preferred_days.filter(d => d !== day)
      : [...formData.preferred_days, day];
    handleChange('preferred_days', days);
  };

  const addTimeWindow = (preset) => {
    const windows = {
      morning: { start: "08:00", end: "12:00", label: "Morning Turnover" },
      afternoon: { start: "12:00", end: "17:00", label: "Afternoon Turnover" }
    };
    handleChange('time_windows', [...formData.time_windows, windows[preset]]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isAuth = await base44.auth.isAuthenticated();
      
      if (!isAuth) {
        toast.info('Please create an account first');
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      const user = await base44.auth.me();

      const cleaner = await base44.entities.Cleaner.create({
        user_id: user.id,
        business_name: formData.display_name,
        bio: formData.bio,
        profile_photo: formData.profile_photo,
        portfolio_photos: formData.work_photos,
        service_area: {
          city: formData.service_area_city,
          postcode_prefix: formData.service_area_postcode,
          radius_miles: formData.travel_radius
        },
        base_price: parseFloat(formData.base_price),
        minimum_charge: parseFloat(formData.minimum_charge),
        subscription_plan: formData.subscription_plan,
        subscription_status: "trial",
        subscription_expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        auto_accept_jobs: formData.auto_accept_enabled,
        max_jobs_per_day: formData.max_jobs_per_day
      });

      // Add cleaner role when profile is created
      if (user?.id) {
        const roles = await getUserRoles(user.id);
        if (!hasRole(roles, 'guest')) {
          await addUserRole(user.id, 'guest');
        }
        if (!hasRole(roles, 'cleaner')) {
          await addUserRole(user.id, 'cleaner');
        }
      }

      toast.success('Welcome to CleanKeep! Your 30-day trial has started. You\'re now a cleaner.');
      setTimeout(() => {
        window.location.href = createPageUrl('CleanerDashboard');
      }, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const showUpgradeMessage = formData.subscription_plan === 'basic';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-white rounded-full shadow-sm border border-blue-100">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Join CleanKeep</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3">
            Earn More Cleaning Holiday Homes<br />Across the UK
          </h1>
          <p className="text-xl text-gray-600 mb-6">
            Create your professional cleaning profile in minutes.<br />
            Connect with verified holiday home owners who need reliable cleaners.
          </p>
          <Button 
            onClick={() => document.getElementById('profile-section').scrollIntoView({ behavior: 'smooth' })}
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6 h-auto"
          >
            Complete Your Profile — Start Free
          </Button>
        </div>

        {/* Why Choose CleanKeep */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6 text-blue-600" />
              Why Professional Cleaners Choose CleanKeep
            </CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Keep 100% of your earnings</div>
                <div className="text-sm text-gray-600">No commission fees on bookings</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Build trusted reputation</div>
                <div className="text-sm text-gray-600">Reviews and verified badges</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Direct host matching</div>
                <div className="text-sm text-gray-600">No middlemen or agencies</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">Control your schedule</div>
                <div className="text-sm text-gray-600">Set your availability and pricing</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Professional Profile */}
          <Card id="profile-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">👤</span>
                Professional Profile
              </CardTitle>
              <CardDescription className="text-base">
                Add what helps hosts trust you. <span className="font-semibold text-blue-600">2 Minute Setup</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    placeholder="e.g., Sarah's Cleaning Services"
                    required
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="experience_level">Experience Level *</Label>
                  <Select 
                    value={formData.experience_level}
                    onValueChange={(val) => handleChange('experience_level', val)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (0-1 year)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (1-3 years)</SelectItem>
                      <SelectItem value="experienced">Experienced (3-5 years)</SelectItem>
                      <SelectItem value="expert">Expert (5+ years)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="city">Location / Service Area *</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="city"
                      value={formData.service_area_city}
                      onChange={(e) => handleChange('service_area_city', e.target.value)}
                      placeholder="City"
                      required
                      className="flex-1"
                    />
                    <Input
                      value={formData.service_area_postcode}
                      onChange={(e) => handleChange('service_area_postcode', e.target.value)}
                      placeholder="Postcode"
                      required
                      className="w-32"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Short Professional Bio *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell hosts about your experience, approach to cleaning, and what makes you reliable..."
                  rows={4}
                  required
                  className="mt-1"
                />
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-3 block">Optional (Highly Recommended)</Label>
                
                <div className="space-y-4">
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="flex items-center gap-4 mt-1">
                      {formData.profile_photo && (
                        <img 
                          src={formData.profile_photo} 
                          alt="Profile" 
                          className="w-20 h-20 rounded-full object-cover border-2 border-blue-200"
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
                          onChange={(e) => handlePhotoUpload(e, 'profile')}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label>Work Photos (Portfolio)</Label>
                    <div className="mt-1">
                      <label className="cursor-pointer block">
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600">Upload before/after photos of your work</p>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handlePhotoUpload(e, 'work')}
                          className="hidden"
                        />
                      </label>
                      {formData.work_photos.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {formData.work_photos.map((photo, idx) => (
                            <img 
                              key={idx}
                              src={photo} 
                              alt={`Work ${idx + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="certifications">Certification Badges</Label>
                    <Input
                      id="certifications"
                      value={formData.certifications}
                      onChange={(e) => handleChange('certifications', e.target.value)}
                      placeholder="e.g., DBS checked, Fully insured, First Aid certified"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="holiday_experience">Holiday Let Experience Notes</Label>
                    <Textarea
                      id="holiday_experience"
                      value={formData.holiday_let_experience}
                      onChange={(e) => handleChange('holiday_let_experience', e.target.value)}
                      placeholder="Describe your experience with holiday home turnovers..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>💡 Tip:</strong> Profiles with photos and experience details receive more job requests.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">💰</span>
                Your Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="base_price">Base Price (£) *</Label>
                  <Input
                    id="base_price"
                    type="number"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => handleChange('base_price', e.target.value)}
                    placeholder="75"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your standard rate for a typical turnover clean</p>
                </div>

                <div>
                  <Label htmlFor="minimum_charge">Minimum Charge (£) *</Label>
                  <Input
                    id="minimum_charge"
                    type="number"
                    step="0.01"
                    value={formData.minimum_charge}
                    onChange={(e) => handleChange('minimum_charge', e.target.value)}
                    placeholder="50"
                    required
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lowest price for smaller jobs</p>
                </div>
              </div>

              <div>
                <Label className="text-base font-semibold mb-3 block">Add Optional Services</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={formData.optional_services.laundry}
                      onCheckedChange={(v) => handleNestedChange('optional_services', 'laundry', v)}
                    />
                    <span>Laundry</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={formData.optional_services.linen_changes}
                      onCheckedChange={(v) => handleNestedChange('optional_services', 'linen_changes', v)}
                    />
                    <span>Linen Changes</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <Checkbox
                      checked={formData.optional_services.deep_cleaning}
                      onCheckedChange={(v) => handleNestedChange('optional_services', 'deep_cleaning', v)}
                    />
                    <span>Deep Cleaning</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Smart Availability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">📅</span>
                Smart Availability
              </CardTitle>
              <CardDescription>Choose how you want to work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.availability_mode === 'active' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="availability_mode"
                    value="active"
                    checked={formData.availability_mode === 'active'}
                    onChange={(e) => handleChange('availability_mode', e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-semibold text-lg">Active Mode</span>
                      <Badge className="bg-green-100 text-green-700">Recommended</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">You are actively looking for work</p>
                    
                    {formData.availability_mode === 'active' && (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div>
                          <Label className="text-sm font-medium mb-2 block">Preferred Working Days</Label>
                          <div className="flex flex-wrap gap-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                              <Button
                                key={day}
                                type="button"
                                variant={formData.preferred_days.includes(day) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleDay(day)}
                                className={formData.preferred_days.includes(day) ? "bg-green-600" : ""}
                              >
                                {day}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium mb-2 block">Time Windows</Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addTimeWindow('morning')}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Morning Turnover (08:00–12:00)
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addTimeWindow('afternoon')}
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Afternoon Turnover (12:00–17:00)
                            </Button>
                          </div>
                          {formData.time_windows.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {formData.time_windows.map((window, idx) => (
                                <Badge key={idx} variant="outline" className="bg-green-50">
                                  {window.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.availability_mode === 'flexible' ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="availability_mode"
                    value="flexible"
                    checked={formData.availability_mode === 'flexible'}
                    onChange={(e) => handleChange('availability_mode', e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="font-semibold text-lg">Flexible Mode</span>
                      <Badge className="bg-yellow-100 text-yellow-700">⭐ Most Popular</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Best for earning more without burnout</p>
                    <p className="text-sm text-gray-700">• Receive job requests<br />• Accept or decline before booking is confirmed</p>
                  </div>
                </label>

                <label className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.availability_mode === 'unavailable' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="radio"
                    name="availability_mode"
                    value="unavailable"
                    checked={formData.availability_mode === 'unavailable'}
                    onChange={(e) => handleChange('availability_mode', e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span className="font-semibold text-lg">Unavailable Mode</span>
                    </div>
                    <p className="text-sm text-gray-600">Block personal time or holidays</p>
                  </div>
                </label>
              </div>

              {formData.availability_mode === 'flexible' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <strong>💡 Soft Conversion Message:</strong> 68% of top-rated cleaners use Flexible Mode.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Automation & Smart Matching */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm">🤖</span>
                Automation & Smart Matching
              </CardTitle>
              <CardDescription>Set job automation rules (Growth Feature)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Auto-accept jobs within price range</Label>
                    <p className="text-sm text-gray-500">Automatically accept jobs that match your criteria</p>
                  </div>
                  <Switch
                    checked={formData.auto_accept_enabled}
                    onCheckedChange={(v) => handleChange('auto_accept_enabled', v)}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label className="text-base font-medium">Auto-accept jobs within travel radius</Label>
                    <p className="text-sm text-gray-500">Only auto-accept jobs within your service area</p>
                  </div>
                  <Switch
                    checked={formData.auto_accept_radius}
                    onCheckedChange={(v) => handleChange('auto_accept_radius', v)}
                  />
                </div>

                <div>
                  <Label htmlFor="max_jobs">Maximum jobs per day</Label>
                  <Input
                    id="max_jobs"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.max_jobs_per_day}
                    onChange={(e) => handleChange('max_jobs_per_day', parseInt(e.target.value))}
                    className="mt-1 w-32"
                  />
                </div>

                <div>
                  <Label htmlFor="travel_radius">Travel Radius</Label>
                  <Select 
                    value={formData.travel_radius.toString()}
                    onValueChange={(val) => handleChange('travel_radius', parseInt(val))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 miles</SelectItem>
                      <SelectItem value="10">10 miles</SelectItem>
                      <SelectItem value="20">20 miles</SelectItem>
                      <SelectItem value="30">Custom radius (30 miles)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">💡 Tip: Shorter travel radius increases repeat client bookings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reputation System */}
          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Award className="w-8 h-8 text-amber-600" />
                Reputation & Ranking System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">Your profile visibility improves based on:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Response speed</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Job completion rate</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Host reviews</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm">Reliability</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm">🏆</span>
                Subscription Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 rounded-lg p-6 transition-all ${formData.subscription_plan === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="subscription_plan"
                    value="basic"
                    checked={formData.subscription_plan === 'basic'}
                    onChange={(e) => handleChange('subscription_plan', e.target.value)}
                    className="mb-3"
                  />
                  <div className="font-bold text-xl mb-2">Basic — £5/month</div>
                  <div className="text-sm text-gray-600 mb-3">Best for starting out</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Profile listing</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Availability calendar</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Job notifications</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Messaging</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Reviews</span>
                    </div>
                  </div>
                </label>

                <label className={`cursor-pointer border-2 rounded-lg p-6 transition-all relative ${formData.subscription_plan === 'pro' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}>
                  <Badge className="absolute top-4 right-4 bg-indigo-600">⭐ Recommended</Badge>
                  <input
                    type="radio"
                    name="subscription_plan"
                    value="pro"
                    checked={formData.subscription_plan === 'pro'}
                    onChange={(e) => handleChange('subscription_plan', e.target.value)}
                    className="mb-3"
                  />
                  <div className="font-bold text-xl mb-2">Pro — £10/month</div>
                  <div className="text-sm text-gray-600 mb-3">Recommended for Growth</div>
                  <div className="text-sm font-medium text-indigo-700 mb-3">
                    Pro gives you stronger visibility and more job opportunities
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>Priority search placement</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>Auto-accept job rules</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>Earnings analytics</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>Verified Cleaner Badge</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-indigo-600" />
                      <span>Repeat client matching</span>
                    </div>
                  </div>
                </label>
              </div>

              {showUpgradeMessage && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    💡 Many professional cleaners upgrade to Pro after securing their first 3–5 regular clients.
                  </p>
                </div>
              )}

              {!showUpgradeMessage && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm text-indigo-900">
                    ✨ Pro cleaners typically earn more through repeat clients and priority matching.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Dashboard Preview */}
          <Card className="bg-gradient-to-br from-gray-50 to-slate-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <BarChart3 className="w-8 h-8 text-slate-600" />
                Your Professional Performance Dashboard Preview
              </CardTitle>
              <CardDescription>After setup you will be able to track:</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900">0</div>
                  <div className="text-sm text-gray-600">Jobs completed</div>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900">£0</div>
                  <div className="text-sm text-gray-600">Earnings estimate</div>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900">—</div>
                  <div className="text-sm text-gray-600">Rating score</div>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-900">0%</div>
                  <div className="text-sm text-gray-600">Repeat client rate</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust & Safety */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Shield className="w-8 h-8 text-green-600" />
                Trust & Safety
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <div className="font-semibold">Verified host network</div>
                    <div className="text-sm text-gray-600">All hosts are verified property owners</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <div className="font-semibold">Direct messaging only</div>
                    <div className="text-sm text-gray-600">Communication stays on platform</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <div className="font-semibold">Transparent reviews</div>
                    <div className="text-sm text-gray-600">Build your reputation with real feedback</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                  <div>
                    <div className="font-semibold">Professional conduct standards</div>
                    <div className="text-sm text-gray-600">Guidelines protect both parties</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="text-center space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                ✨ <strong>30-day free trial</strong> • No payment required right now • Cancel anytime
              </p>
            </div>
            <Button 
              type="submit" 
              className="bg-blue-600 hover:bg-blue-700 text-lg px-12 py-6 h-auto"
              disabled={loading}
            >
              {loading ? 'Creating Profile...' : '🚀 Save & Publish Professional Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}