import { rejects } from 'assert';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    // const storagedCart = Buscar dados do localStorage
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let newCart = cart;

      const stock = await api.get('/stock/' + productId);
      const product = await api.get('/products/' + productId);

      const storageAmount = stock.data.amount;
      const actualProduct = product.data;

      if (actualProduct) {
        const alReadyExists = cart.findIndex(
          (item) => item.id === actualProduct.id
        );

        if (alReadyExists > -1) {
          //Se existe
          if (storageAmount === cart[alReadyExists].amount) {
            throw new Error('Quantidade solicitada fora de estoque');
          }

          newCart = newCart.map((item) =>
            item.id === productId ? { ...item, amount: item.amount + 1 } : item
          );
        } else {
          //Ainda não existe
          newCart = [...cart, { ...actualProduct, amount: 1 }];
        }
      }
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err: any) {
      err.response?.status === 404
        ? toast.error('Erro na adição do produto')
        : toast.error(err.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const newCart = cart.filter((item) => item.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stock = await api.get('/stock/' + productId);
      const storageAmount = stock.data.amount;

      if (amount === storageAmount + 1) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const newCart = cart.map((product) =>
        productId === product.id ? { ...product, amount: amount } : product
      );
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
    } catch (err: any) {
      err.response?.status === 404
        ? toast.error('Erro na adição do produto')
        : toast.error(err.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
