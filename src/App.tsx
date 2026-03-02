import { useState } from 'react';
import { Truck, Fuel, MapPin, Navigation, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { motion } from 'motion/react';

const formSchema = z.object({
  origin: z.string().min(1, 'Origem é obrigatória'),
  destination: z.string().min(1, 'Destino é obrigatório'),
  dieselPrice: z.number().min(0.1, 'Preço inválido'),
  tankCapacity: z.number().min(10, 'Capacidade inválida'),
  avgSpeed: z.number().min(10, 'Velocidade inválida'),
});

type FormData = z.infer<typeof formSchema>;

interface CalculationResult {
  distanceKm: number;
  durationHours: number;
  litersNeeded: number;
  totalCost: number;
  tanksNeeded: number;
  originAddress: string;
  destinationAddress: string;
}

export default function App() {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, any>>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dieselPrice: 5.89,
      tankCapacity: 300,
      avgSpeed: 80,
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);
    setResult(null);

    const cacheKey = `${data.origin.toLowerCase().trim()}-${data.destination.toLowerCase().trim()}`;

    try {
      let routeData;
      
      if (cache[cacheKey]) {
        routeData = cache[cacheKey];
      } else {
        const response = await axios.post('/api/calculate-route', {
          origin: data.origin,
          destination: data.destination,
        });
        routeData = response.data;
        setCache(prev => ({ ...prev, [cacheKey]: routeData }));
      }

      const { distanceKm, originAddress, destinationAddress } = routeData;

      const durationHours = distanceKm / data.avgSpeed;
      const consumptionKm = data.tankCapacity / 600;
      const litersNeeded = distanceKm * consumptionKm;
      const totalCost = litersNeeded * data.dieselPrice;
      const tanksNeeded = distanceKm / 600;

      setResult({
        distanceKm,
        durationHours,
        litersNeeded,
        totalCost,
        tanksNeeded,
        originAddress,
        destinationAddress,
      });
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error || 'Erro ao calcular a rota. Verifique as cidades e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}min`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans selection:bg-blue-900 selection:text-white">
      <header className="bg-slate-900 text-white py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <Truck className="w-8 h-8 text-blue-400" />
          <h1 className="text-2xl font-bold tracking-tight">LogiTruck Calc</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-900" />
                Nova Rota
              </h2>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Origem
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        {...register('origin')}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 sm:text-sm bg-slate-50"
                        placeholder="Ex: São Paulo, SP"
                      />
                    </div>
                    {errors.origin && (
                      <p className="mt-1 text-sm text-red-600">{errors.origin.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Destino
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        {...register('destination')}
                        className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 sm:text-sm bg-slate-50"
                        placeholder="Ex: Rio de Janeiro, RJ"
                      />
                    </div>
                    {errors.destination && (
                      <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Preço do Diesel (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('dieselPrice', { valueAsNumber: true })}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 sm:text-sm bg-slate-50"
                    />
                    {errors.dieselPrice && (
                      <p className="mt-1 text-sm text-red-600">{errors.dieselPrice.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Capacidade (L)
                    </label>
                    <input
                      type="number"
                      {...register('tankCapacity', { valueAsNumber: true })}
                      className="block w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 sm:text-sm bg-slate-50"
                    />
                    {errors.tankCapacity && (
                      <p className="mt-1 text-sm text-red-600">{errors.tankCapacity.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Velocidade Média (km/h)
                  </label>
                  <input
                    type="number"
                    {...register('avgSpeed', { valueAsNumber: true })}
                    className="block w-full px-3 py-3 border border-slate-300 rounded-xl focus:ring-blue-900 focus:border-blue-900 sm:text-sm bg-slate-50"
                  />
                  {errors.avgSpeed && (
                    <p className="mt-1 text-sm text-red-600">{errors.avgSpeed.message}</p>
                  )}
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-blue-900 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculando...
                    </span>
                  ) : (
                    'Calcular Rota'
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-7">
            {result ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 border-b border-slate-100 pb-4">
                    Resumo da Rota
                  </h3>
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                    <div>
                      <p className="text-sm text-slate-500">Origem</p>
                      <p className="font-medium text-slate-900">{result.originAddress}</p>
                    </div>
                    <div className="hidden sm:block text-slate-300">
                      <Navigation className="w-6 h-6 rotate-90" />
                    </div>
                    <div className="sm:text-right">
                      <p className="text-sm text-slate-500">Destino</p>
                      <p className="font-medium text-slate-900">{result.destinationAddress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Navigation className="w-5 h-5 text-blue-700" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Distância Total</p>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {result.distanceKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-lg font-medium text-slate-500">km</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-emerald-700" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Custo Combustível</p>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {formatCurrency(result.totalCost)}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-100 rounded-lg">
                          <Fuel className="w-5 h-5 text-amber-700" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Consumo Estimado</p>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {result.litersNeeded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-lg font-medium text-slate-500">L</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-700" />
                        </div>
                        <p className="text-sm font-medium text-slate-600">Tempo de Viagem</p>
                      </div>
                      <p className="text-3xl font-bold text-slate-900">
                        {formatTime(result.durationHours)}
                      </p>
                    </div>
                  </div>

                  {result.tanksNeeded > 1 && (
                    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-800">Atenção: Abastecimento Necessário</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          A rota exige {result.tanksNeeded.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} tanques. Será necessário reabastecer durante o trajeto.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Future Evolution Placeholder */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 opacity-60">
                  <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center justify-between">
                    <span>Análise Financeira Avançada</span>
                    <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">PRO</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Custo por KM</p>
                      <p className="text-xl font-semibold text-slate-400">{formatCurrency(result.totalCost / result.distanceKm)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Consumo Médio</p>
                      <p className="text-xl font-semibold text-slate-400">{(result.distanceKm / result.litersNeeded).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km/l</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                  <MapPin className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-medium text-slate-900 mb-2">Nenhuma rota calculada</h3>
                <p className="text-slate-500 max-w-md">
                  Preencha os dados da origem, destino e informações do veículo ao lado para visualizar o custo e tempo estimado da sua viagem.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
