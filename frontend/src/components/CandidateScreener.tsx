
import React, { useState } from 'react';
import { Upload, FileText, Zap, Mail, Copy, CheckCircle, XCircle, AlertCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface ScreeningResult {
  candidate_email: string;
  experience_level: string;
  skill_match: number;
  decision: 'accept' | 'reject' | 'maybe';
}

interface ScreeningResponse {
  success: boolean;
  data?: ScreeningResult;
  error?: string;
}

const CandidateScreener: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const { toast } = useToast();

  // Handle file upload via drag and drop or click
  const handleFileUpload = (uploadedFile: File) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(uploadedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    if (uploadedFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setFile(uploadedFile);
    toast({
      title: "File uploaded successfully",
      description: `${uploadedFile.name} is ready for screening.`,
    });
  };

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Submit screening request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !jobDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please upload a resume and provide a job description.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('job_description', jobDescription);

      const response = await fetch('http://localhost:8000/screen', {
        method: 'POST',
        body: formData,
      });

      const data: ScreeningResponse = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
        toast({
          title: "Screening complete",
          description: "Check out the results below.",
        });
      } else {
        throw new Error(data.error || 'Screening failed');
      }
    } catch (error) {
      console.error('Screening error:', error);
      toast({
        title: "Screening failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Copy email to clipboard
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: "Email copied",
        description: "Email address copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy email to clipboard.",
        variant: "destructive",
      });
    }
  };

  // Generate mailto link
  const generateMailto = (email: string, decision: string) => {
    const subject = encodeURIComponent(`Application Status Update - ${decision === 'accept' ? 'Congratulations!' : decision === 'maybe' ? 'Next Steps' : 'Thank You'}`);
    const body = encodeURIComponent(
      decision === 'accept' 
        ? "Hi there!\n\nGreat news! We'd love to move forward with your application. Let's schedule a time to chat!\n\nBest regards,\nThe Team"
        : decision === 'maybe'
        ? "Hi there!\n\nThanks for your application! We'd like to learn more about you. Are you available for a quick call this week?\n\nBest regards,\nThe Team"
        : "Hi there!\n\nThank you for taking the time to apply. While we won't be moving forward at this time, we appreciate your interest and encourage you to apply for future opportunities.\n\nBest of luck!\nThe Team"
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // Get decision styling
  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case 'accept':
        return {
          bg: 'bg-gradient-to-r from-emerald-600 to-green-600',
          text: 'text-white',
          icon: <CheckCircle className="w-5 h-5" />,
          badge: 'Approved'
        };
      case 'maybe':
        return {
          bg: 'bg-gradient-to-r from-amber-600 to-orange-600',
          text: 'text-white',
          icon: <AlertCircle className="w-5 h-5" />,
          badge: 'Review'
        };
      case 'reject':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-rose-600',
          text: 'text-white',
          icon: <XCircle className="w-5 h-5" />,
          badge: 'Declined'
        };
      default:
        return {
          bg: 'bg-gray-600',
          text: 'text-white',
          icon: <AlertCircle className="w-5 h-5" />,
          badge: 'Unknown'
        };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-main p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Users className="w-12 h-12 text-blue-400" />
            <h1 className="text-5xl font-bold text-white">
              NaukriGraph
            </h1>
          </div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            AI-powered candidate screening platform using LangGraph to help HR teams hire the right people efficiently
          </p>
          <div className="mt-4 text-sm text-slate-400">
            Powered by advanced AI technology for intelligent recruitment decisions
          </div>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-slate-600/50">
            <CardHeader className="bg-gradient-blue-dark text-white text-center py-6">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <Upload className="w-6 h-6" />
                Upload Resume
              </CardTitle>
              <CardDescription className="text-blue-100">
                Drag & drop or click to upload (PDF/DOCX only)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer hover:scale-[1.02] ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-500/10 animate-pulse-glow' 
                    : file 
                    ? 'border-emerald-400 bg-emerald-500/10' 
                    : 'border-slate-400 hover:border-blue-400 hover:bg-slate-800/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-input')?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {file ? (
                  <div className="space-y-3">
                    <FileText className="w-16 h-16 mx-auto text-emerald-400" />
                    <div>
                      <p className="text-lg font-semibold text-emerald-300">{file.name}</p>
                      <p className="text-sm text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-16 h-16 mx-auto text-slate-400" />
                    <div>
                      <p className="text-lg font-semibold text-white">Drop your resume here</p>
                      <p className="text-sm text-slate-400">Or click to browse files</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Job Description Section */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden border border-slate-600/50">
            <CardHeader className="bg-gradient-purple-dark text-white text-center py-6">
              <CardTitle className="text-2xl flex items-center justify-center gap-2">
                <FileText className="w-6 h-6" />
                Job Description
              </CardTitle>
              <CardDescription className="text-purple-100">
                Paste the job requirements and description
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-2">
                <Label htmlFor="job-description" className="text-base font-semibold text-white">
                  Job Requirements & Description
                </Label>
                <Textarea
                  id="job-description"
                  placeholder="Paste the job description here... Include skills, experience level, responsibilities, etc. The more details, the better the screening accuracy."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[200px] text-base bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-400 rounded-xl resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="text-center">
            <Button
              type="submit"
              disabled={!file || !jobDescription.trim() || isLoading}
              className="px-12 py-6 text-xl font-bold bg-gradient-indigo-dark hover:scale-105 transform transition-all duration-300 rounded-xl shadow-2xl border-0 text-white disabled:opacity-50 disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Analyzing Candidate...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-3" />
                  Start AI Screening
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Results Section */}
        {result && (
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl overflow-hidden animate-fade-in border border-slate-600/50">
            <CardHeader className="bg-gradient-dark text-white text-center py-6">
              <CardTitle className="text-3xl font-bold">
                Screening Results
              </CardTitle>
              <CardDescription className="text-slate-300 text-lg">
                AI-powered analysis of candidate compatibility
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Card */}
                <Card className="bg-slate-800/50 border border-slate-600/50 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                  <CardContent className="p-6 text-center">
                    <Mail className="w-12 h-12 mx-auto mb-3 text-blue-400" />
                    <h3 className="text-lg font-bold mb-2 text-white">Contact Information</h3>
                    <p className="text-sm text-slate-300 mb-3">{result.candidate_email}</p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => window.open(generateMailto(result.candidate_email, result.decision))}
                        className="flex-1 bg-gradient-blue-dark text-white rounded-lg hover:scale-105 transform transition-all duration-200"
                        size="sm"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Send Email
                      </Button>
                      <Button
                        onClick={() => copyEmail(result.candidate_email)}
                        variant="outline"
                        className="rounded-lg hover:scale-105 transform transition-all duration-200 border-slate-600 text-slate-300 hover:bg-slate-700"
                        size="sm"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Experience Level Card */}
                <Card className="bg-slate-800/50 border border-slate-600/50 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-purple-dark rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">🎯</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white">Experience Level</h3>
                    <p className="text-2xl font-bold text-gradient capitalize">
                      {result.experience_level}
                    </p>
                  </CardContent>
                </Card>

                {/* Skill Match Card */}
                <Card className="bg-slate-800/50 border border-slate-600/50 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-r from-emerald-600 to-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-xl">📊</span>
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white">Skill Match</h3>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-3xl font-bold text-emerald-400">
                            {result.skill_match}%
                          </span>
                        </div>
                      </div>
                      <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-700">
                        <div
                          style={{ width: `${result.skill_match}%` }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-600 to-green-600 rounded-full transition-all duration-1000"
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Decision Card */}
                <Card className={`border border-slate-600/50 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 ${getDecisionStyle(result.decision).bg}`}>
                  <CardContent className="p-6 text-center">
                    <div className="flex items-center justify-center mb-3">
                      {getDecisionStyle(result.decision).icon}
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${getDecisionStyle(result.decision).text}`}>
                      Final Decision
                    </h3>
                    <p className={`text-2xl font-bold capitalize ${getDecisionStyle(result.decision).text}`}>
                      {getDecisionStyle(result.decision).badge}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CandidateScreener;
