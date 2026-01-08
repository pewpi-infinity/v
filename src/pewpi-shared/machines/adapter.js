/**
 * State Machine Adapter - Adapts external state machines to pewpi-shared events
 * Provides a bridge between state management libraries and pewpi event system
 */

class MachineAdapter {
  constructor() {
    this.machines = new Map();
    this.subscriptions = new Map();
  }

  /**
   * Register a state machine
   * @param {string} name - Machine name
   * @param {object} machine - State machine instance (XState, custom, etc.)
   */
  register(name, machine) {
    if (this.machines.has(name)) {
      console.warn(`[MachineAdapter] Machine "${name}" already registered`);
      return;
    }

    this.machines.set(name, machine);
    console.log(`[MachineAdapter] Registered machine: ${name}`);
  }

  /**
   * Unregister a state machine
   * @param {string} name - Machine name
   */
  unregister(name) {
    if (!this.machines.has(name)) {
      console.warn(`[MachineAdapter] Machine "${name}" not found`);
      return;
    }

    // Clean up subscriptions
    if (this.subscriptions.has(name)) {
      const unsubscribe = this.subscriptions.get(name);
      unsubscribe();
      this.subscriptions.delete(name);
    }

    this.machines.delete(name);
    console.log(`[MachineAdapter] Unregistered machine: ${name}`);
  }

  /**
   * Subscribe a machine to pewpi events
   * @param {string} machineName - Machine name
   * @param {string} eventType - pewpi event type (e.g., 'token.created')
   * @param {function} handler - Event handler function
   */
  subscribe(machineName, eventType, handler) {
    if (!this.machines.has(machineName)) {
      throw new Error(`Machine "${machineName}" not registered`);
    }

    const eventName = eventType.startsWith('pewpi.') ? eventType : `pewpi.${eventType}`;
    
    const listener = (event) => {
      const machine = this.machines.get(machineName);
      handler(machine, event.detail);
    };

    window.addEventListener(eventName, listener);

    // Store unsubscribe function
    const key = `${machineName}:${eventType}`;
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key).push(() => {
      window.removeEventListener(eventName, listener);
    });

    console.log(`[MachineAdapter] Subscribed ${machineName} to ${eventName}`);

    return () => {
      window.removeEventListener(eventName, listener);
    };
  }

  /**
   * Send event to a registered machine
   * @param {string} machineName - Machine name
   * @param {string} eventType - Event type
   * @param {*} data - Event data
   */
  send(machineName, eventType, data) {
    const machine = this.machines.get(machineName);
    
    if (!machine) {
      console.warn(`[MachineAdapter] Machine "${machineName}" not found`);
      return;
    }

    // Support different machine APIs
    if (typeof machine.send === 'function') {
      // XState-style
      machine.send({ type: eventType, data });
    } else if (typeof machine.transition === 'function') {
      // Custom state machine
      machine.transition(eventType, data);
    } else if (typeof machine.dispatch === 'function') {
      // Redux-style
      machine.dispatch({ type: eventType, payload: data });
    } else {
      console.warn(`[MachineAdapter] Machine "${machineName}" has no compatible interface`);
    }
  }

  /**
   * Get current state of a machine
   * @param {string} machineName - Machine name
   */
  getState(machineName) {
    const machine = this.machines.get(machineName);
    
    if (!machine) {
      console.warn(`[MachineAdapter] Machine "${machineName}" not found`);
      return null;
    }

    // Support different state access patterns
    if (machine.state) {
      return machine.state;
    } else if (machine.getState && typeof machine.getState === 'function') {
      return machine.getState();
    } else if (machine.value) {
      return machine.value;
    }

    return null;
  }

  /**
   * Create a simple state machine
   * @param {string} name - Machine name
   * @param {object} config - State machine configuration
   */
  createSimpleMachine(name, config) {
    const machine = {
      state: config.initial || 'idle',
      states: config.states || {},
      
      transition(event, data) {
        const currentState = this.state;
        const stateConfig = this.states[currentState];
        
        if (stateConfig && stateConfig.on && stateConfig.on[event]) {
          const nextState = stateConfig.on[event];
          console.log(`[SimpleMachine:${name}] ${currentState} -> ${nextState} (${event})`);
          this.state = nextState;
          
          // Call entry action if defined
          const nextStateConfig = this.states[nextState];
          if (nextStateConfig && nextStateConfig.entry) {
            nextStateConfig.entry(data);
          }
        }
      },
      
      getState() {
        return this.state;
      }
    };

    this.register(name, machine);
    return machine;
  }

  /**
   * Cleanup all machines and subscriptions
   */
  destroy() {
    // Unsubscribe all
    this.subscriptions.forEach((unsubscribers) => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    });
    
    this.subscriptions.clear();
    this.machines.clear();
    
    console.log('[MachineAdapter] All machines destroyed');
  }
}

// Export singleton instance
export const machineAdapter = new MachineAdapter();
export default MachineAdapter;
