import { useState, useRef, ChangeEvent } from 'react';
import { db, UserProfile, OperationType, handleFirestoreError } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Save, User, Phone, MapPin, Info, BookOpen, Building, Hash, GraduationCap, Camera, Link, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProfileManagementProps {
  user: UserProfile;
  title?: string;
  description?: string;
}

export default function ProfileManagement({ user, title = "Your Profile", description = "Manage your personal information" }: ProfileManagementProps) {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone?.replace(/^\+91/, '') || '',
    address: user.address || '',
    bio: user.bio || '',
    photoURL: user.photoURL || '',
    department: user.department || '',
    subjects: user.subjects?.join(', ') || '',
    grade: user.grade || '',
    section: user.section || '',
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone ? `+91${formData.phone}` : '',
        address: formData.address,
        bio: formData.bio,
        photoURL: formData.photoURL,
        updatedAt: new Date().toISOString(),
      };

      if (user.role === 'teacher') {
        updateData.department = formData.department;
        updateData.subjects = formData.subjects.split(',').map(s => s.trim()).filter(s => s !== '');
      } else if (user.role === 'student') {
        updateData.grade = formData.grade;
        updateData.section = formData.section;
      }

      await updateDoc(doc(db, 'users', user.uid), updateData);
      toast.success("Profile updated successfully");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast.error("Image size should be less than 1MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="relative group">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange}
              />
              <div 
                className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary border-4 border-white shadow-sm overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => fileInputRef.current?.click()}
              >
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt={formData.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  formData.name.charAt(0)
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-1 text-center md:text-left">
              <h3 className="text-2xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-slate-500 font-medium">{user.email}</p>
              <div className="flex justify-center md:justify-start gap-2 mt-2">
                <Badge className="capitalize px-3 py-1">{user.role}</Badge>
                {user.role === 'student' && formData.grade && (
                  <Badge variant="outline" className="bg-white">Grade {formData.grade}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Common Fields */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                Full Name
              </Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                Contact Number
              </Label>
              <div className="flex">
                <div className="flex items-center justify-center px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-md text-sm font-bold text-slate-500">
                  +91
                </div>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="9876543210"
                  className="rounded-l-none bg-white border-slate-200"
                />
              </div>
            </div>

            {/* Role Specific Fields */}
            {user.role === 'teacher' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600">
                    <Building className="h-4 w-4 text-slate-400" />
                    Department
                  </Label>
                  <Input 
                    value={formData.department} 
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Science, Mathematics"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    Subjects
                  </Label>
                  <Input 
                    value={formData.subjects} 
                    onChange={(e) => setFormData({ ...formData, subjects: e.target.value })}
                    placeholder="e.g. Physics, Chemistry (comma separated)"
                    className="bg-white border-slate-200"
                  />
                </div>
              </>
            )}

            {user.role === 'student' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600">
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                    Grade / Class
                  </Label>
                  <Input 
                    value={formData.grade} 
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="e.g. 10th, 12th"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-slate-600">
                    <Hash className="h-4 w-4 text-slate-400" />
                    Section
                  </Label>
                  <Input 
                    value={formData.section} 
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    placeholder="e.g. A, B, C"
                    className="bg-white border-slate-200"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2 text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                Address
              </Label>
              <Input 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 School St, City, Country"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label className="flex items-center gap-2 text-slate-600">
                <Info className="h-4 w-4 text-slate-400" />
                Bio
              </Label>
              <Textarea 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us a bit about yourself..."
                className="min-h-[100px] bg-white border-slate-200"
              />
            </div>
          </div>
          
          <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-slate-400 italic text-center sm:text-left">
              Some details are synced with your Google Account.
            </p>
            <Button onClick={handleSave} disabled={loading} className="gap-2 w-full sm:w-auto shadow-md">
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
