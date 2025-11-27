 import React, { useState, useEffect, createContext, useContext } from 'react';
 import AsyncStorage from '@react-native-async-storage/async-storage';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,FlatList,ActivityIndicator,Modal,Alert,
  ScrollView,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  Platform
} 
from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

const SERVER_URL = 'https://novenosis.xyz:3017';
const API_BASE = `${SERVER_URL}/api`;
const UPLOADS_URL = `${SERVER_URL}/uploads/`;

const getImageUrl = (idValue) => {
  if (!idValue) return null;
  if (idValue.startsWith('http') && !idValue.includes('localhost')) {
    return { uri: idValue };
  }
  if (idValue.includes('localhost') || idValue.includes('/uploads/')) {
    const parts = idValue.split('/');
    const filename = parts[parts.length - 1];
    return { uri: UPLOADS_URL + filename };
  }
  return { uri: UPLOADS_URL + idValue };
};

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);

  // Cargar sesión guardada
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const savedUser = await AsyncStorage.getItem('user');
        const savedToken = await AsyncStorage.getItem('token');

        if (savedUser && savedToken) {
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }
      } catch (err) {
        console.log('Error cargando sesión:', err);
      } finally {
        setCargandoSesion(false);
      }
    };

    cargarSesion();
  }, []);

  // Login que guarda en AsyncStorage
  const login = async (userData, userToken) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('token', userToken);

      setUser(userData);
      setToken(userToken);
    } catch (err) {
      console.log('Error guardando sesión:', err);
    }
  };

  // Logout que borra AsyncStorage
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      await AsyncStorage.removeItem('token');
    } catch (err) {
      console.log("Error al cerrar sesión:", err);
    }

    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, cargandoSesion }}>
      {children}
    </AuthContext.Provider>
  );
};


const AppButton = ({ title, onPress, type = 'primary', style, disabled }) => {
  const bg = type === 'primary' ? '#007bff' : type === 'danger' ? '#dc3545' : type === 'success' ? '#28a745' : '#6c757d';
  return (
    <TouchableOpacity 
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.6 : 1 }, style]} 
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.btnText}>{title}</Text>
    </TouchableOpacity>
  );
};

const AppInput = ({ label, value, onChangeText, secureTextEntry, keyboardType, placeholder }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      placeholder={placeholder || label}
      placeholderTextColor="#999"
      autoCapitalize="none"
    />
  </View>
);

const ListItem = ({ title, subtitle, details, imageUrl, onEdit, onDelete, showActions }) => (
  <View style={styles.card}>
    {imageUrl && (
      <Image 
        source={imageUrl} 
        style={styles.cardImage} 
        resizeMode="cover"
      />
    )}
    <View style={styles.cardContent}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      {details && <Text style={styles.cardDetails}>{details}</Text>}
    </View>
    
    {showActions && (
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={onEdit} style={[styles.actionBtn, { backgroundColor: '#ffc107' }]}>
          <Text style={styles.actionBtnText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}>
          <Text style={styles.actionBtnText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    )}
  </View>
);

const FormModal = ({ visible, onClose, title, children, onSave, loading }) => (
  <Modal visible={visible} animationType="slide" transparent={true}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <ScrollView style={{ maxHeight: 400 }}>
          {children}
        </ScrollView>
        <View style={styles.modalButtons}>
          <AppButton title="Cancelar" onPress={onClose} type="secondary" style={{ flex: 1, marginRight: 5 }} />
          <AppButton 
            title={loading ? "Guardando..." : "Guardar"} 
            onPress={onSave} 
            type="success" 
            style={{ flex: 1, marginLeft: 5 }} 
            disabled={loading}
          />
        </View>
      </View>
    </View>
  </Modal>
);




const LoginPantalla = ({ navigation }) => {
  const { login } = useContext(AuthContext);

  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarLogin = async () => {
    if (!usuario || !contrasena)
      return Alert.alert("Error", "Porfavor Ingrese los campos");

    setCargando(true);

    try {
      const respuesta = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password: contrasena })
      });

      const data = await respuesta.json();

      if (respuesta.ok && data.token) {
        const usuarioDatos = data.usuario || { nombre: usuario, rol: "2" };
        login(usuarioDatos, data.token);
      } else {
        Alert.alert("Error", data.mensaje || "Credenciales incorrectas");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo conectar al servidor: " + e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 2,
          backgroundColor: "#0F2027",
        }}
      >
        {/* DEGRADADO */}
        <View
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "#203A43",
          }}
        />
        <View
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            backgroundColor: "#2C5364",
            opacity: 0.7,
          }}
        />

       
        <View
       style={{
       padding: 25,
       borderRadius: 20,
       alignItems: "center",
       width: "100%",
       backgroundColor: "rgba(255,255,255,0.15)",
       borderWidth: 1,
       borderColor: "rgba(255,255,255,0.3)",
       
       }}
      >

      {/* ICONO DE INICIO */}
      <View
    style={{
      backgroundColor: "rgba(255,255,255,0.25)",
      padding: 20,
      borderRadius: 100,
      marginBottom: 15,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.4)",
    }}
  >
    <Text style={{ fontSize: 45 }}>🔒</Text>
  </View>

  <Text style={{ fontSize: 20, fontWeight: "bold", color: "#000000ff", marginBottom: 5 }}>
    Ferreteria-tornillo Feliz
  </Text>

  <Text style={{ textAlign: "center", color: "#eee", marginBottom: 20 }}>
    Toda Herramienta en un mismo solo lugar 
  </Text>

  {/* USUARIO */}
  <TextInput
    style={nuevoEstilo.input}
    placeholder="Usuario"
    placeholderTextColor="#ddd"
    value={usuario}
    onChangeText={setUsuario}
  />

  {/* CONTRASEÑA */}
  <TextInput
    style={[nuevoEstilo.input, { marginTop: 15 }]}
    placeholder="Contraseña"
    placeholderTextColor="#ddd"
    value={contrasena}
    secureTextEntry
    onChangeText={setContrasena}
  />

  {/* BOTÓN */}
  {cargando ? (
    <ActivityIndicator size="large" color="#fff" style={{ marginTop: 20 }} />
  ) : (
    <TouchableOpacity
      onPress={manejarLogin}
      style={nuevoEstilo.boton}
    >
      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
        INGRESA
      </Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity
    onPress={() => navigation.navigate("Register")}
    style={{ marginTop: 15 }}
  >
    <Text style={{ color: "#fff" }}>Registrate📝</Text>
  </TouchableOpacity>
      </View>
      </View>
    </SafeAreaView>
  );
};


const regisroPantalla = ({ navigation }) => {
  const [form, setForm] = useState({ 
    usuario: '', 
    password: '', 
    rol: '', 
    estado: '1'
  });
  
  const handleRegister = async () => {
    if (!form.usuario || !form.password || !form.rol) {
      return Alert.alert('Error', 'Todos los campos son obligatorios');
    }

    try {
      const res = await fetch(`${API_BASE}/registro`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        Alert.alert('Éxito', 'Usuario registrado correctamente');
        navigation.goBack();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.mensaje || 'No se pudo registrar');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de conexión al registrar');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <Text style={styles.headerTitle}>Registro</Text>
        <AppInput label="Usuario" value={form.usuario} onChangeText={t => setForm({...form, usuario: t})} />
        <AppInput label="Contraseña" value={form.password} onChangeText={t => setForm({...form, password: t})} secureTextEntry />
        
        <AppInput 
          label="Rol (1: Administrador, 2: Usuario)" 
          value={form.rol} 
          onChangeText={t => setForm({...form, rol: t})} 
          keyboardType="numeric"
          placeholder="Ingrese 1 o 2"
        />

        <AppButton title="REGISTRARSE" onPress={handleRegister} type="success" style={{ marginTop: 20 }} />
        <AppButton title="VOLVER" onPress={() => navigation.goBack()} type="secondary" style={{ marginTop: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const homepantalla = ({ navigation }) => {
  const { user } = useContext(AuthContext);

  return (
    <View style={{ flex: 1, backgroundColor: "#3582f5ff", justifyContent: "center", padding: 20 }}>

      <View
        style={{
          backgroundColor: "#ffffffff",
          padding: 25,
          borderRadius: 20,
          alignItems: "center",
          elevation: 8,
          shadowColor: "#000",
        }}
      >
        <View
          style={{
            backgroundColor: "#3498db20",
            padding: 25,
            borderRadius: 100,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 50 }}>🏠</Text>
        </View>

        <Text style={{ fontSize: 28, fontWeight: "bold", color: "#2c3e50" }}>
          ¡Bienvenido!
        </Text>

        <Text style={{ marginTop: 5, fontSize: 20, color: "#555" }}>
          {user?.nombre || user?.usuario}
        </Text>

        <Text
          style={{
            textAlign: "center",
            marginTop: 15,
            fontSize: 16,
            color: "#7f8c8d",
            paddingHorizontal: 10,
          }}
        >
        </Text>

        <TouchableOpacity
          onPress={() => navigation.navigate("Menu")}
          style={{
            backgroundColor: "#3498db",
            paddingVertical: 15,
            paddingHorizontal: 30,
            borderRadius: 12,
            marginTop: 25,
            width: "85%",
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 18, fontWeight: "bold" }}>
            IR AL MENÚ PRINCIPAL
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


const MenuPantall = ({ navigation }) => { 
  const { logout, user } = useContext(AuthContext);
  const isAdmin = user?.rol == 1;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#eef2f5" }}>

      {/* CABECERA */}
      <View style={{
        padding: 25,
        backgroundColor: "#2c3e50",
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        marginBottom: 20
      }}>
        <Text style={{ color: "#fff", fontSize: 26, fontWeight: "bold" }}>
          🔩 Ferretería El Tornillo Feliz
        </Text>
        <Text style={{ color: "#ddd", marginTop: 5 }}>
          👤 Usuario: {user?.usuario}
        </Text>
      </View>

      {/* CONTENEDOR DE MENÚ EN CÍRCULOS */}
      <View style={{
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        paddingHorizontal: 10
      }}>

        <MenuCircle 
          titulo="Inicio" 
          icono="🏠" 
          onPress={() => navigation.navigate("Inicio")} 
        />

        <MenuCircle 
          titulo="Materiales" 
          icono="🛠️" 
          onPress={() => navigation.navigate("Materiales")} 
        />

        <MenuCircle 
          titulo="Proveedores" 
          icono="👨‍🔧" 
          onPress={() => navigation.navigate("Proveedores")} 
        />

        <MenuCircle 
          titulo="Vendedores" 
          icono="👨‍💼" 
          onPress={() => navigation.navigate("Vendedores")} 
        />

        {isAdmin && (
          <MenuCircle 
            titulo="Usuarios" 
            icono="👥"
            color="#e74c3c"
            onPress={() => navigation.navigate("Usuarios")} 
          />
        )}

      </View>

      {/* BOTÓN DE SALIR */}
      <TouchableOpacity
        onPress={logout}
        style={{
          marginTop: 30,
          backgroundColor: "#e74c3c",
          padding: 15,
          borderRadius: 12,
          alignItems: "center",
          marginHorizontal: 40
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
          🔓 Cerrar Sesión
        </Text>
      </TouchableOpacity>

    </ScrollView>
  );
};



const CrudPantallas = ({ endpoint, title, fields, renderItem, idField = '_id' }) => {
  const { token, user } = useContext(AuthContext);
  const isAdmin = user?.rol == 1;

  const [data, setData] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({});

  const headers = { 
    'Content-Type': 'application/json',
    'Autorizacion': `Back ${token}`
  };

  const cargardata = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargardata(); }, []);

  const manejarGuardar = async () => {
    setLoading(true);
    try {
      const isEdit = !!currentItem;
      const createUrl = `${API_BASE}/insercion_${endpoint}`;
      const updateUrl = `${API_BASE}/actualizar_${endpoint}/${currentItem?.[fields[0].key]}`;
      
      const url = isEdit ? updateUrl : createUrl;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(form)
      });

      if (res.ok) {
        Alert.alert('Éxito', 'Operación realizada correctamente');
        setModalVisible(false);
        cargardata();
      } else {
        const err = await res.json();
        Alert.alert('Error', err.error || 'Error en el servidor');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const manejarEliminar = (item) => {
    Alert.alert('Confirmar', `¿Eliminar ${item[fields[0].key]}?`, [
      { text: 'Cancelar' },
      { 
        text: 'Eliminar',
        style: 'destructive', 
        onPress: async () => {
          try {
            const deleteKey = item[fields[0].key] || item.nombre || item.usuario;
            await fetch(`${API_BASE}/eliminar_${endpoint}/${deleteKey}`, { method: 'DELETE', headers });
            cargardata();
          } catch(e) { 
            Alert.alert('Error', 'No se pudo eliminar'); 
          }
        }
      }
    ]);
  };

  const openEdit = (item) => {
    setCurrentItem(item);
    setForm(item);
    setModalVisible(true);
  };

  const openNew = () => {
    setCurrentItem(null);
    const emptyForm = {};
    fields.forEach(f => emptyForm[f.key] = '');
    setForm(emptyForm);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>{title}</Text>
        {isAdmin && (
          <AppButton title="+ Nuevo" onPress={openNew} type="success" style={{ width: 100 }} />
        )}
      </View>

      {loading && !modalVisible && (
        <ActivityIndicator size="large" color="#007bff" style={{ marginVertical: 20 }} />
      )}

      <FlatList
        data={data}
        keyExtractor={(item, index) => item[idField] || index.toString()}
        renderItem={({ item }) => {
          const itemData = renderItem(item);
          return (
            <ListItem 
              title={itemData.title}
              subtitle={itemData.subtitle}
              details={itemData.details}
              imageUrl={itemData.imageUrl}
              showActions={isAdmin} 
              onEdit={() => openEdit(item)}
              onDelete={() => manejarEliminar(item)}
            />
          );
        }}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <FormModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        title={currentItem ? `Editar ${title}` : `Nuevo ${title}`}
        onSave={manejarGuardar}
        loading={loading}
      >
        {fields.map(field => (
          <AppInput
            key={field.key}
            label={field.label}
            value={String(form[field.key] || '')}
            editable={!field.readonly}                   // 👈 NO SE PUEDE EDITAR SI ES READONLY
            onChangeText={(text) => {
              if (field.readonly) return;               // 👈 BLOQUEA CAMBIO
              setForm({ ...form, [field.key]: text });
            }}
            keyboardType={field.type === 'number' ? 'numeric' : 'default'}
            style={[
              field.readonly && { backgroundColor: '#e5e5e5' }  // opcional visual
            ]}
          />
        ))}
      </FormModal>
    </View>
  );
};


const MaterialesScreen = () => (
  <CrudPantallas 
    endpoint="Materiales" 
    title="Gestión de Materiales"
    fields={[
      { key: 'NombreMaterial', label: 'Nombre' },
      { key: 'estilo', label: 'Estilo' },
      { key: 'precio', label: 'Precio', type: 'number' },
      { key: 'inventario', label: 'Inventario', type: 'number' },
      { key: 'id', label: 'URL Imagen' }, 
    ]}
    renderItem={(item) => ({
      title: item.NombreMaterial,
      subtitle: `Estilo: ${item.estilo}`,
      details: `$${item.precio} | Stock: ${item.inventario}`,
      imageUrl: getImageUrl(item.id)
    })}
  />
);
const ProvedoresPantalla = () => (
  <CrudPantallas 
    endpoint="Proveedores" 
    title="Proveedores"

    customEndpoints={{
      create: "insercion_Provedores",   
      update: "actualizar_Proveedores",
      delete: "eliminar_Proveedores"
    }}

    fields={[
      { key: 'nombre', label: 'Nombre' },
      { key: 'telefono', label: 'Teléfono', type: 'number' },
      { key: 'email', label: 'Email' },
    ]}

    renderItem={(item) => ({
      title: item.nombre,
      subtitle: item.email,
      details: `Tel: ${item.telefono}`
    })}
  />
);


const vEndedoresPantalla = () => (
  <CrudPantallas 
    endpoint="Vendedores" 
    title="Vendedores"
    fields={[
      { key: 'nombre', label: 'Nombre' },
      { key: 'telefono', label: 'Teléfono', type: 'number' },
      { key: 'email', label: 'Email' },
    ]}
    renderItem={(item) => ({
      title: item.nombre,
      subtitle: item.email,
      details: `Tel: ${item.telefono}`
    })}
  />
);

const UsuariosPantalla = () => (
  <CrudPantallas 
    endpoint="Usuarios" 
    title="Control de Usuarios"
    idField="_id"
    fields={[
      { key: 'usuario', label: 'Usuario' },
      { key: 'password', label: 'Password' },
      { key: 'rol', label: 'Rol (1: Admin, 2: User)', type: 'number' },
      { key: 'estado', label: 'Estado (1: Activo)', type: 'number' },
    ]}
    renderItem={(item) => ({
      title: item.usuario,
      subtitle: `Rol: ${item.rol === 1 ? 'Admin' : 'Usuario'}`,
      details: `Estado: ${item.estado}`
    })}
  />
);

const Stack = createNativeStackNavigator();

const MainApp = () => {
  const { user } = useContext(AuthContext);
  const isAdmin = user?.rol == 1;

  return (
    <Stack.Navigator 
      screenOptions={{
        headerStyle: { backgroundColor: '#343a40' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="Inicio" component={homepantalla} options={{ title: 'Ferreteria el tornillo feliz' }} />
      <Stack.Screen name="Menu" component={MenuPantall} options={{ title: 'Menu' }} />
      <Stack.Screen name="Materiales" component={MaterialesScreen} />
      <Stack.Screen name="Proveedores" component={ProvedoresPantalla} />
      <Stack.Screen name="Vendedores" component={vEndedoresPantalla} />
      {isAdmin && (
        <Stack.Screen name="Usuarios" component={UsuariosPantalla} />
      )}
    </Stack.Navigator>
  );
};

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginPantalla} />
    <Stack.Screen name="Register" component={regisroPantalla} />
  </Stack.Navigator>
); 

export default function App() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}

const RootNavigation = () => {
  const { user, cargandoSesion } = useContext(AuthContext);

  if (cargandoSesion) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: "#0F1115",
        justifyContent: "center",
        alignItems: "center"
      }}>
        <ActivityIndicator size="large" color="#00A8FF" />
        <Text style={{ color: "#fff", marginTop: 10 }}>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" />
      {user ? <MainApp /> : <AuthStack />}
    </NavigationContainer>
  );
};
;

const styles = StyleSheet.create({

  //  CONTENEDOR GENERAL 
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#0F1115'
  },

  // CONTENEDOR CENTRADO 
  centerContainer: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#0F1115'
  },

  // CAJA DE LOGIN 
  loginBox: {
    width: '90%',
    padding: 35,
    borderRadius: 25,
    backgroundColor: '#1A1D24', 
    borderWidth: 1,
    borderColor: '#2D313A',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 10,
  },

  // TITULOS
  headerTitle: { 
    fontSize: 30, 
    fontWeight: '700',
    color: '#E9F1FF',
    textAlign: 'center',
    marginBottom: 8,
  },

  subHeader: { 
    fontSize: 16, 
    color: '#9BA4B5',
    textAlign: 'center',
    marginBottom: 25 
  },

  // NPUTS 
  inputContainer: { marginBottom: 18 },

  label: { 
    fontSize: 14, 
    fontWeight: '600',
    color: '#C8D2E0',
    marginBottom: 6 
  },

  input: { 
    padding: 12,
    borderRadius: 12,
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#232830', 
    borderWidth: 1,
    borderColor: '#3A3F48',
  },

  // BOTONES 
  btn: { 
    paddingVertical: 14, 
    borderRadius: 14,
    alignItems: 'center',
    marginVertical: 7,
    backgroundColor: '#00A8FF', 
  },

  btnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 17,
    letterSpacing: 0.5
  },

 //  TARJETAS EN CRUD
 card: { flexDirection: 'row', padding: 15, borderRadius: 20, marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', shadowColor: "#00D4FF", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 6 }, shadowRadius: 10, elevation: 12 },
  cardImage: { 
    width: 75, 
    height: 75, 
    borderRadius: 12,
    backgroundColor: '#292E37',
    marginRight: 12
  },

  cardContent: { flex: 1 },

  cardTitle: { 
    fontSize: 19, 
    fontWeight: '700',
    color: '#E9F1FF'
  },

  cardSubtitle: { 
    fontSize: 14, 
    color: '#AAB4C7',
    marginTop: 4
  },

  cardDetails: { 
    fontSize: 12, 
    color: '#7D8899',
    marginTop: 6
  },

  cardActions: { 
    paddingLeft: 10, 
    justifyContent: 'center' 
  },

  actionBtn: { 
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#00A8FF',
    marginBottom: 8
  },

  actionBtnText: { 
    fontSize: 12, 
    color: '#ffffff',
    fontWeight: 'bold' 
  },

  // TOP BAR 
  topBar: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18 
  },

  pageTitle: { 
    fontSize: 25, 
    fontWeight: 'bold',
    color: '#E9F1FF'
  },

  //  MODAL 
  modalOverlay: { 
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    padding: 25 
  },

  modalContent: { 
    backgroundColor: '#1A1D24', 
    borderRadius: 20,
    padding: 25,
    borderWidth: 1,
    borderColor: '#2C3038'
  },

  modalTitle: { 
    fontSize: 22, 
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15
  },

  modalButtons: { 
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 25 
  },
});



const MenuCircle = ({ titulo, icono, onPress, color = "#3498db" }) => (
  <TouchableOpacity 
    onPress={onPress}
    style={{
      width: 110,
      height: 110,
      backgroundColor: "#fff",
      borderRadius: 100,
      justifyContent: "center",
      alignItems: "center",
      margin: 15,
      elevation: 5,
      shadowColor: "#000",
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 6,
      borderWidth: 2,
      borderColor: color
    }}
  >
    <Text style={{ fontSize: 40 }}>{icono}</Text>
    <Text style={{ marginTop: 5, fontSize: 14, fontWeight: "700", color: "#333", textAlign: "center" }}>
      {titulo}
    </Text>
  </TouchableOpacity>
);


const nuevoEstilo = {
  input: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    color: "#fff",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },

  boton: {
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingVertical: 15,
    borderRadius: 12,
    marginTop: 25,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  }
};

